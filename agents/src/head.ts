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
} from "./memory/og-kv";
import { appendLog } from "./memory/og-log";
import { runStrategy } from "./execution/strategies/index";
import { emitEvent } from "./events";
import { log } from "./util/log";
import type {
  AXLMessage,
  AxlEnvelope,
  DeathCause,
  HeadId,
  HeadState,
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

  // Subprocesses
  startHeartbeat({ identity, axl, mesh, state: initialState });

  const consensus = startConsensus(
    { identity, axl, mesh, state: initialState },
    {
      onConfirmedDeath: async (target, cause) => {
        // Leader: write scar + broadcast + trigger resurrection (Day 2 Block B)
        await onLeadershipResurrection(target, cause);
      },
    },
  );

  bindResurrectionHandler({ identity, axl, mesh, state: initialState });
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
    if (!scarRegistry.has(cause)) {
      const scar = buildScar(cause, target, initialState.generation + 1);
      scarRegistry.add(scar);
      await persistGlobalScar(scar);
      await broadcastScar(identity, axl, mesh, scar);
    }
    // 2. Resurrection (Day 2 Block B wires this)
    log.info(`leader: would resurrect ${target.slice(0, 10)}… (Block B)`);
  }

  initialState.status = "healthy";
  log.info(`healthy · strategy=${STRATEGY}`);
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
