import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { loadIdentity } from "./identity";
import { AXLClient } from "./axl/client";
import { Mesh } from "./axl/mesh";
import { startHeartbeat } from "./heartbeat";
import { startConsensus } from "./consensus";
import { bindResurrectionHandler } from "./resurrection";
import { startDiagnostics } from "./diagnostics";
import {
  ScarRegistry,
  buildScar,
  persistGlobalScar,
  broadcastScar,
  readGlobalScars,
} from "./scars";
import {
  writeStateSnapshot,
  bootstrapFromMemory,
  readStateSnapshot,
} from "./memory/og-kv";
import { appendLog } from "./memory/og-log";
import { runStrategy } from "./execution/strategies/index";
import {
  recordDeathOnChain,
  recordBornOnChain,
  recordScarOnChain,
  mintScarINFT,
  depositToTreasury,
} from "./execution/chain";
import { ask as askOgCompute } from "./memory/og-compute";
import { executeWorkflow } from "./execution/keeperhub";
import { emitEvent } from "./events";
import { log } from "./util/log";
import type {
  AXLMessage,
  AxlEnvelope,
  DeathCause,
  HeadId,
  HeadState,
  Scar,
  StrategyKind,
} from "../../shared/types";
import { STATE_SNAPSHOT_INTERVAL_MS } from "../../shared/constants";

const HEAD_INDEX = Number(process.env.HEAD_INDEX ?? "1");
const STRATEGY = (process.env.HEAD_STRATEGY as StrategyKind) ?? "aave_deposit";
const PARENT_ID = process.env.PARENT_ID ?? null;
const PID_FILE = `logs/head-${HEAD_INDEX}.pid`;

async function main() {
  await writeFile(PID_FILE, String(process.pid), "utf8").catch(() => {});

  const identity = await loadIdentity(HEAD_INDEX);
  const axl = new AXLClient(HEAD_INDEX);
  const mesh = new Mesh(identity.id);
  await mesh.registerKnownPeersFromKeysDir();

  log.info(
    `booting · id=${identity.id.slice(0, 10)}… · wallet=${identity.wallet}`,
  );

  await axl.getMyPeerId();

  // Bootstrap state — inherit from parent if we're a child
  const initialState: HeadState = PARENT_ID
    ? await bootstrapFromMemory(PARENT_ID, identity)
    : {
        id: identity.id,
        generation: 0,
        parent: null,
        status: "booting",
        strategy: STRATEGY,
        wallet: identity.wallet,
        balance: "0",
        position: null,
        lastHeartbeatAt: Date.now(),
        inheritedScars: [],
        bornAt: Date.now(),
        deathCause: null,
      };

  // Pre-load all global scars (children inherit, originals start empty)
  const scarRegistry = new ScarRegistry(await readGlobalScars());
  initialState.inheritedScars = scarRegistry.all().map((s) => s.id);

  await writeStateSnapshot(initialState);
  await emitEvent(identity.id, "head.boot", {
    headIndex: HEAD_INDEX,
    strategy: STRATEGY,
    parent: PARENT_ID,
    inheritedScarCount: scarRegistry.all().length,
  });

  // Originals deposit a small position to HydraTreasury on boot so the swarm
  // has real on-chain AUM. Children inherit via redistribute on death — they
  // don't deposit again. Heads share a single deployer wallet so deposits
  // need to be staggered to avoid nonce collisions. We stagger by HEAD_INDEX
  // (head-1 deposits at +0s, head-2 at +5s, head-3 at +10s).
  if (!PARENT_ID && process.env.HYDRA_DEPOSIT_ON_BOOT !== "0") {
    void (async () => {
      const staggerMs = (HEAD_INDEX - 1) * 5_000;
      if (staggerMs > 0) {
        log.debug(`waiting ${staggerMs}ms before deposit (avoid nonce collision)`);
        await new Promise((r) => setTimeout(r, staggerMs));
      }
      try {
        const amount = BigInt(
          process.env.HYDRA_BOOT_DEPOSIT_WEI ?? "1000000000000000",
        ); // 0.001 OG default
        const tx = await depositToTreasury(identity.id, amount);
        initialState.balance = amount.toString();
        await writeStateSnapshot(initialState);
        await emitEvent(identity.id, "treasury.deposit", {
          tx,
          amount: amount.toString(),
        });
      } catch (err) {
        log.warn(`treasury deposit on boot skipped: ${(err as Error).message}`);
      }
    })();
  }

  // Children: ask 0G Compute (TEE-verified) for an action signal once on boot.
  // Best-effort — if the broker has no live providers we just log and continue.
  if (PARENT_ID && process.env.OG_COMPUTE_LIVE === "1") {
    void (async () => {
      try {
        const recentScars = scarRegistry
          .all()
          .map((s) => `${s.cause}: ${s.rule.mitigation}`)
          .slice(-5)
          .join("; ");
        const prompt = `You are a newly-spawned HYDRA agent inheriting from a dead parent. Strategy: ${STRATEGY}. Recent scars: ${recentScars || "none"}. In one sentence: should I act now or wait? Reply with "ACT" or "WAIT" plus a one-line reason.`;
        const r = await askOgCompute(prompt);
        await emitEvent(identity.id, "compute.inference", {
          decision: r.answer.slice(0, 200),
          verified: r.verified,
          provider: r.providerAddress.slice(0, 16),
          model: r.model,
          ms: r.durationMs,
        });
      } catch (err) {
        log.warn(`0G Compute fallback: ${(err as Error).message}`);
        await emitEvent(identity.id, "compute.skip", {
          reason: (err as Error).message,
        });
      }
    })();
  }

  // Children — broadcast a `born` message after AXL connect, before the
  // first heartbeat. Without this, peers only learn the child exists once
  // its heartbeats start arriving, which leaves a brief window where they
  // may route messages to a child they don't know about. The dispatch
  // handler on peers calls mesh.registerDynamic on receipt so the child is
  // marked alive immediately.
  if (PARENT_ID) {
    const mostRecentScar = scarRegistry.all().slice(-1)[0] ?? null;
    const bornMsg: AXLMessage = {
      type: "born",
      from: identity.id,
      parent: PARENT_ID,
      gen: initialState.generation,
      scar: mostRecentScar,
    };
    const livePeers = mesh.livePeers();
    await Promise.all(livePeers.map((p) => axl.send(p.id, bornMsg)));
    await emitEvent(identity.id, "born.broadcast", {
      parent: PARENT_ID.slice(0, 16),
      to: livePeers.length,
    });
    log.info(`👶 born broadcast sent to ${livePeers.length} peers`);
  }

  // Subprocesses
  startHeartbeat({ identity, axl, mesh, state: initialState });

  const resurrection = bindResurrectionHandler({
    identity,
    axl,
    mesh,
    state: initialState,
  });

  const consensus = startConsensus(
    { identity, axl, mesh, state: initialState },
    {
      onConfirmedDeath: async (target, cause) => {
        await onLeadershipResurrection(target, cause);
      },
    },
  );

  startDiagnostics({ identity, axl, mesh, state: initialState });

  setInterval(() => {
    void writeStateSnapshot(initialState);
  }, STATE_SNAPSHOT_INTERVAL_MS);

  runStrategy(initialState, axl);

  // Receive loop — feeds consensus + dispatches other types
  void (async () => {
    for await (const env of axl.recvStream()) {
      const msg = env.body;
      await emitEvent(identity.id, "axl.recv", {
        type: msg.type,
        from: msg.from?.slice(0, 16) + "…",
      });
      try {
        consensus.handleMessage(env);
        await dispatch(env, mesh, initialState, scarRegistry);
      } catch (err) {
        log.warn(`dispatch ${msg.type}: ${(err as Error).message}`);
      }
    }
  })();

  async function onLeadershipResurrection(
    target: HeadId,
    cause: DeathCause,
  ): Promise<void> {
    // 1. Build + persist + broadcast scar
    let newScar: Scar | null = null;
    if (!scarRegistry.has(cause)) {
      newScar = buildScar(cause, target, initialState.generation + 1);
      scarRegistry.add(newScar);
      await persistGlobalScar(newScar);
      await broadcastScar(identity, axl, mesh, newScar);
      // KH workflow — scar-mint audit fires every time the swarm learns
      const scarWorkflowId =
        process.env.HYDRA_KH_SCAR_WORKFLOW_ID ?? "up22dre1y0frp1pskrbuj";
      void executeWorkflow(
        scarWorkflowId,
        {
          kind: "scar-mint",
          cause,
          rule: newScar.rule,
          learnedFrom: target,
          generation: newScar.generation,
          ts: newScar.learnedAt,
          authorityPeerId: identity.id,
        },
        "scar-mint",
      );
    }
    // 2. Spawn 2 children + broadcast resurrect message (in-memory work)
    let result: { childIds: HeadId[]; childIndices: number[] } | null = null;
    try {
      result = await resurrection.resurrect(target, cause);
    } catch (err) {
      log.err(`resurrection failed: ${(err as Error).message}`);
    }
    // 2a. Emit redistribute event with the dead head's last known balance.
    //     Value-protected counter on the dashboard sums these — the swarm
    //     redistributed this much instead of losing it to the dead head's wallet.
    //     Also fire the KH treasury-redistribute workflow so the move is in
    //     KH's run history alongside the death-event.
    try {
      const dead = await readStateSnapshot(target);
      if (dead && dead.balance && dead.balance !== "0") {
        await emitEvent(identity.id, "treasury.redistribute", {
          deadHead: target,
          amount: dead.balance,
          childHeads: result?.childIds ?? [],
        });
        const treasuryWorkflowId =
          process.env.HYDRA_KH_TREASURY_WORKFLOW_ID ?? "uybkmq5v2mpvgji7933ji";
        void executeWorkflow(
          treasuryWorkflowId,
          {
            kind: "treasury-redistribute",
            deadHead: target,
            amount: dead.balance,
            childHeads: result?.childIds ?? [],
            ts: Date.now(),
            authorityPeerId: identity.id,
          },
          "treasury-redistribute",
        );
      }
    } catch {
      // best-effort
    }
    // 3. Fire KeeperHub direct execution in parallel (independent of chain tx).
    //    The death-event workflow gets the redistribute payload so KH's run
    //    history captures one death + spawn cycle per attack.
    if (result) {
      const deathWorkflowId =
        process.env.HYDRA_KH_DEATH_WORKFLOW_ID ?? "lcyuk85gh46defy5xaq8b";
      void executeWorkflow(
        deathWorkflowId,
        {
          kind: "death-event",
          deadHead: target,
          cause,
          childHeads: result.childIds,
          childIndices: result.childIndices,
          ts: Date.now(),
          authorityPeerId: identity.id,
        },
        "death-event",
      );
    }
    // 4. Record on chain SERIALLY to avoid nonce collisions on the same wallet.
    //    Fire-and-forget the whole chain; failures are logged, not raised.
    void (async () => {
      try {
        await recordDeathOnChain(target, cause);
      } catch (err) {
        log.warn(`chain death record failed: ${(err as Error).message}`);
      }
      if (newScar) {
        try {
          await recordScarOnChain(cause, newScar.rule.mitigation);
        } catch (err) {
          log.warn(`chain scar record failed: ${(err as Error).message}`);
        }
        // Mint iNFT for this scar so it's visible on chainscan as ERC-721 transfer
        try {
          await mintScarINFT(cause, newScar.rule.mitigation, identity.wallet);
        } catch (err) {
          log.warn(`iNFT mint failed: ${(err as Error).message}`);
        }
      }
      if (result) {
        for (const childId of result.childIds) {
          try {
            await recordBornOnChain(
              childId,
              target,
              initialState.generation + 1,
            );
          } catch (err) {
            log.warn(`chain born record failed: ${(err as Error).message}`);
          }
        }
      }
    })();
  }

  initialState.status = "healthy";
  log.info(`healthy · strategy=${STRATEGY}`);
}

async function writeDeadTombstone(
  target: HeadId,
  cause: DeathCause,
): Promise<void> {
  const existing = (await readStateSnapshot(target)) as HeadState | null;
  if (!existing) return;
  if (existing.status === "dead") return;
  existing.status = "dead";
  existing.deathCause = cause;
  await writeStateSnapshot(existing);
}

async function dispatch(
  env: AxlEnvelope,
  mesh: Mesh,
  state: HeadState,
  scars: ScarRegistry,
): Promise<void> {
  const msg: AXLMessage = env.body;
  switch (msg.type) {
    case "heartbeat":
      mesh.markSeen(msg.from, msg.gen);
      await appendLog(state.id, {
        type: "heartbeat.recv",
        payload: { from: msg.from.slice(0, 16), gen: msg.gen },
      });
      break;
    case "confirmed":
      // Mark the dead head's persisted state as dead so dashboards know.
      await writeDeadTombstone(msg.target, msg.cause);
      break;
    case "scar":
      scars.add(msg.scar);
      log.info(`scar inherited: ${msg.scar.cause} (${scars.all().length} total)`);
      await appendLog(state.id, {
        type: "scar.recv",
        payload: { cause: msg.scar.cause, from: msg.from.slice(0, 16) },
      });
      break;
    case "born":
      mesh.registerDynamic(msg.from, 0);
      log.info(
        `peer born: ${msg.from.slice(0, 10)}… (parent ${msg.parent.slice(0, 10)}…)`,
      );
      await appendLog(state.id, {
        type: "born.recv",
        payload: { from: msg.from.slice(0, 16), parent: msg.parent.slice(0, 16) },
      });
      break;
    default:
      break;
  }
}

main().catch((err) => {
  log.err("fatal:", err);
  process.exit(1);
});
