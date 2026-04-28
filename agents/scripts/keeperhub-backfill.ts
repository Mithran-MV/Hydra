/**
 * One-shot KH backfill for attacks #1 and #2.
 *
 * The webhook era of the agent (commits before 07c2d00) called the public
 * KH webhook URL with the org `kh_` key, which 401'd because that endpoint
 * expects a `wfb_` user key. As a result, no real run was logged in the KH
 * dashboard for either historical attack.
 *
 * This script replays the death + treasury-redistribute + scar-mint events
 * for both attacks via executeWorkflow (MCP HTTP transport), so the KH
 * dashboard gains the historical runs in addition to the live ones. Each
 * payload carries its original timestamp + a `replay: true` flag so KH
 * reviewers can distinguish backfill from live.
 *
 * Run from the repo root:
 *   tsx agents/scripts/keeperhub-backfill.ts
 *
 * KEEPERHUB_KEY must be in env.
 */
import "dotenv/config";
import { executeWorkflow } from "../src/execution/keeperhub";

const DEATH_WF = process.env.HYDRA_KH_DEATH_WORKFLOW_ID ?? "lcyuk85gh46defy5xaq8b";
const TREASURY_WF = process.env.HYDRA_KH_TREASURY_WORKFLOW_ID ?? "uybkmq5v2mpvgji7933ji";
const SCAR_WF = process.env.HYDRA_KH_SCAR_WORKFLOW_ID ?? "up22dre1y0frp1pskrbuj";

const ATTACKS = [
  {
    num: 1,
    utc: "2026-04-28T11:52:46Z",
    ts: 1777377166854,
    cause: "process_killed" as const,
    deadHead: "f17413e08d5f2a8da59d4e8694c9139a9263d82169b39edcae086c6f7193b9fa",
    target: "h2 (univ4_lp)",
    childHeads: [
      "9d290b2a93c6f1d0d24018cd4b85c37e5239e4490b8cd44d302bffd63edc1d84",
      "a7d09de72b74cdac23329fc0f577e3548c1922ff705a196e6473a4b97267f732",
    ],
    childIndices: [4, 5],
    deadHeadBalanceWei: "1000000000000000",
    leader: "182cc7e7707917984d1bde90bd1b6ad1f22134877ac9d45b9dba7643c6837ba7",
    rule: {
      trigger: "on unclean process exit",
      check: "checkpoint state to 0G on every heartbeat instead of every 10s",
      mitigation: "shorter checkpoint interval + supervisord respawn",
    },
    inftMintTx:
      "0x26d45f5a98e8fe77470a90d0a727617e543a4586723c6e5ff58ee0c82e19d926",
  },
  {
    num: 2,
    utc: "2026-04-28T12:45:25Z",
    ts: 1777380325923,
    cause: "wallet_drained" as const,
    deadHead: "182cc7e7707917984d1bde90bd1b6ad1f22134877ac9d45b9dba7643c6837ba7",
    target: "h1 (aave_deposit)",
    childHeads: [
      "3843ba88a97ab8ebbcbc74b0c47ea4a71049bdb6455fece5fe5735114f240adc",
      "7404c8786356058e9bb4fee93365dca39467d4f8a04ef4dd80311dcf4574dd0b",
    ],
    childIndices: [8, 9],
    deadHeadBalanceWei: "1000000000000000",
    leader: "1ef963e4b8f05588c56aa048db2af9723dc34f10cbf4163674c18504590c2c1c",
    rule: {
      trigger: "on balance delta exceeding threshold",
      check: "monitor wallet for outflows > 10% of AUM",
      mitigation: "halt strategy + require multi-sig approval for next action",
    },
    inftMintTx:
      "0x995f2c88072ec25b74b7cb940d4553a3145400552a0ee9ccfe9928adb436e94f",
  },
];

async function main() {
  console.log("=== KH backfill — attacks #1 and #2 ===");
  for (const a of ATTACKS) {
    console.log(`\n--- attack #${a.num} (${a.cause} on ${a.target}) ---`);

    const death = await executeWorkflow(
      DEATH_WF,
      {
        kind: "death-event",
        replay: true,
        deadHead: a.deadHead,
        cause: a.cause,
        childHeads: a.childHeads,
        childIndices: a.childIndices,
        ts: a.ts,
        authorityPeerId: a.leader,
      },
      "death-event",
    );
    console.log(`  death-event: ok=${death.ok} executionId=${death.executionId} ${death.error ?? ""}`);

    const treasury = await executeWorkflow(
      TREASURY_WF,
      {
        kind: "treasury-redistribute",
        replay: true,
        deadHead: a.deadHead,
        amount: a.deadHeadBalanceWei,
        childHeads: a.childHeads,
        ts: a.ts,
        authorityPeerId: a.leader,
      },
      "treasury-redistribute",
    );
    console.log(`  treasury-redistribute: ok=${treasury.ok} executionId=${treasury.executionId} ${treasury.error ?? ""}`);

    const scar = await executeWorkflow(
      SCAR_WF,
      {
        kind: "scar-mint",
        replay: true,
        cause: a.cause,
        rule: a.rule,
        learnedFrom: a.deadHead,
        generation: 1,
        ts: a.ts,
        inftMintTx: a.inftMintTx,
        authorityPeerId: a.leader,
      },
      "scar-mint",
    );
    console.log(`  scar-mint: ok=${scar.ok} executionId=${scar.executionId} ${scar.error ?? ""}`);
  }
  console.log("\n✓ backfill done");
}

main().catch((err) => {
  console.error("BACKFILL FAILED:", err);
  process.exit(1);
});
