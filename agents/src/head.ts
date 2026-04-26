import "dotenv/config";
import { loadIdentity } from "./identity";
import { AXLClient } from "./axl/client";
import { Mesh } from "./axl/mesh";
import { startHeartbeat } from "./heartbeat";
import { startConsensus } from "./consensus";
import { bindResurrectionHandler } from "./resurrection";
import {
  writeStateSnapshot,
  bootstrapFromMemory,
} from "./memory/og-kv";
import { appendLog } from "./memory/og-log";
import { runStrategy } from "./execution/strategies/index";
import { emitEvent } from "./events";
import { log } from "./util/log";
import type { HeadState, StrategyKind, AXLMessage } from "../../shared/types";
import { STATE_SNAPSHOT_INTERVAL_MS } from "../../shared/constants";

const HEAD_INDEX = Number(process.env.HEAD_INDEX ?? "1");
const STRATEGY = (process.env.HEAD_STRATEGY as StrategyKind) ?? "aave_deposit";
const PARENT_ID = process.env.PARENT_ID ?? null;

async function main() {
  const identity = await loadIdentity(HEAD_INDEX);
  const axl = new AXLClient(HEAD_INDEX);
  const mesh = new Mesh(identity.id);
  await mesh.registerKnownPeersFromKeysDir();

  log.info(
    `booting · id=${identity.id.slice(0, 10)}… · wallet=${identity.wallet}`,
  );

  // Wait for AXL to be ready (and our peer-id reachable).
  await axl.getMyPeerId();

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

  await writeStateSnapshot(initialState);
  await emitEvent(identity.id, "head.boot", {
    headIndex: HEAD_INDEX,
    strategy: STRATEGY,
    parent: PARENT_ID,
  });

  // Subprocesses
  startHeartbeat({ identity, axl, mesh, state: initialState });
  startConsensus({ identity, axl, mesh, state: initialState });
  bindResurrectionHandler({ identity, axl, mesh, state: initialState });

  // State snapshot heartbeat to 0G
  setInterval(() => {
    void writeStateSnapshot(initialState);
  }, STATE_SNAPSHOT_INTERVAL_MS);

  runStrategy(initialState, axl);

  // Receive loop — dispatch by message type
  void (async () => {
    for await (const env of axl.recvStream()) {
      const msg = env.body;
      await emitEvent(identity.id, "axl.recv", {
        type: msg.type,
        from: msg.from?.slice(0, 16) + "…",
      });
      try {
        await dispatch(msg, mesh, initialState);
      } catch (err) {
        log.warn(`dispatch ${msg.type}: ${(err as Error).message}`);
      }
    }
  })();

  initialState.status = "healthy";
  log.info(`healthy · strategy=${STRATEGY}`);
}

async function dispatch(
  msg: AXLMessage,
  mesh: Mesh,
  state: HeadState,
): Promise<void> {
  switch (msg.type) {
    case "heartbeat":
      mesh.markSeen(msg.from, msg.gen);
      await appendLog(state.id, { type: "heartbeat.recv", payload: { from: msg.from.slice(0, 16), gen: msg.gen } });
      break;
    case "scar":
      // Day 2 — store scar locally + persist to 0G global stream
      log.info(`scar inherited: ${msg.scar.cause}`);
      break;
    case "born":
      mesh.registerDynamic(msg.from, 0);
      log.info(`peer born: ${msg.from.slice(0, 10)}… (parent ${msg.parent.slice(0, 10)}…)`);
      break;
    case "panic":
      log.warn(`PANIC from ${msg.from.slice(0, 10)}…: ${msg.reason}`);
      break;
    // suspect / confirmed / resurrect handled by consensus.ts (Day 2)
    default:
      break;
  }
}

main().catch((err) => {
  log.err("fatal:", err);
  process.exit(1);
});
