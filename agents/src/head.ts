import "dotenv/config";
import { loadIdentity } from "./identity.js";
import { AXLClient } from "./axl/client.js";
import { startHeartbeat } from "./heartbeat.js";
import { startConsensus } from "./consensus.js";
import { bindResurrectionHandler } from "./resurrection.js";
import { writeStateSnapshot, bootstrapFromMemory } from "./memory/og-kv.js";
import { runStrategy } from "./execution/strategies/index.js";
import type { HeadState, StrategyKind } from "../../shared/types.js";
import { STATE_SNAPSHOT_INTERVAL_MS } from "../../shared/constants.js";

const HEAD_INDEX = Number(process.env.HEAD_INDEX ?? "1");
const STRATEGY = (process.env.HEAD_STRATEGY as StrategyKind) ?? "aave_deposit";
const PARENT_ID = process.env.PARENT_ID ?? null;

async function main() {
  const identity = await loadIdentity(HEAD_INDEX);
  const axl = new AXLClient(HEAD_INDEX);

  console.log(`[head-${HEAD_INDEX}] booting · id=${identity.id.slice(0, 10)}…`);

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

  await axl.waitForPeers(2);
  console.log(`[head-${HEAD_INDEX}] mesh joined`);

  startHeartbeat({ identity, axl, state: initialState });
  startConsensus({ identity, axl, state: initialState });
  bindResurrectionHandler({ identity, axl, state: initialState });

  setInterval(() => writeStateSnapshot(initialState), STATE_SNAPSHOT_INTERVAL_MS);
  runStrategy(initialState, axl);

  initialState.status = "healthy";
  console.log(`[head-${HEAD_INDEX}] healthy · strategy=${STRATEGY}`);
}

main().catch((err) => {
  console.error(`[head-${HEAD_INDEX}] fatal:`, err);
  process.exit(1);
});
