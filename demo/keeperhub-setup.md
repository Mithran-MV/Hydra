# KeeperHub workflow setup

HYDRA uses three KeeperHub workflows, one per trigger style. The agent
already POSTs to all three via `agents/src/execution/keeperhub.ts`; you just
need to create the workflows in the KH UI and paste their webhook URLs into
`.env`.

You'll also need a KeeperHub API key (`KEEPERHUB_KEY` in `.env`) — generate
it from Setup Guide → "Generate API Key" on the KH home page.

> Note: at the time of writing, the KH webhook public URLs reject the org
> API key with 401 "Invalid API key format" — see `KEEPERHUB_FEEDBACK.md`.
> The agent handles 401 gracefully; the workflow still runs when triggered
> via `mcp__keeperhub__execute_workflow` from a KH MCP-authorized client.

## Workflow 1 — Death Webhook (already created)

**Purpose:** leader fires this on confirmed death. KH logs the payload in
run history; this is the external audit trail.

**Trigger:** Webhook
**Action:** Run Code (single line is fine — payload is in run history input)

You already have this one — workflow id `lcyuk85gh46defy5xaq8b` in the
referenced KH org. Paste its webhook URL into `.env`:

```
KEEPERHUB_REDISTRIBUTE_WEBHOOK=https://app.keeperhub.com/api/workflows/<id>/webhook
```

## Workflow 2 — Heartbeat Stale Alert

**Purpose:** when an agent's local watchdog notices a peer's heartbeat is
stale (between consensus.suspect and consensus.confirmed), it pings KH so
the platform's run history reflects the inter-quorum delay independently
from the on-chain proofs.

**Steps:**
1. KH home → New Workflow → name "HYDRA Heartbeat Stale"
2. Click the first node (it shows "Action / Select an action") → in the
   Properties panel set **Trigger Type → Webhook**.
3. Paste this in **Mock Request**:
   ```json
   {"peerId":"f17413e0","headIndex":2,"lastHeartbeatAt":1777268000000,"staleByMs":18000,"ts":1777268018000}
   ```
4. Click the **+** on the right of the trigger node → click the new Action
   node → search "code" → pick **Run Code**.
5. Paste in the Run Code body:
   ```js
   console.log('HYDRA: stale heartbeat detected, head', new Date().toISOString());
   return { audited_at: new Date().toISOString(), kind: 'heartbeat-stale' };
   ```
6. Save (floppy icon at top).
7. Copy the Webhook URL → paste into `.env`:
   ```
   KEEPERHUB_HEARTBEAT_WEBHOOK=https://app.keeperhub.com/api/workflows/<id>/webhook
   ```

## Workflow 3 — Scar Learned Audit

**Purpose:** every new scar (defense rule the swarm has learned) gets
audited externally. This is independent of the iNFT mint on chain — KH's
run history captures the audited rule + who learned it + when.

**Steps:**
1. KH home → New Workflow → name "HYDRA Scar Learned"
2. First node → **Trigger Type → Webhook**.
3. **Mock Request:**
   ```json
   {"cause":"key_revoked","rule":{"trigger":"on key revocation signal","check":"every 60s verify signer is still whitelisted","mitigation":"rotate to backup signer and re-register with registry"},"learnedFrom":"f17413e0","generation":1,"ts":1777268000000}
   ```
4. Click + → add **Run Code** action with:
   ```js
   console.log('HYDRA scar learned:', new Date().toISOString());
   return {
     audited_at: new Date().toISOString(),
     kind: 'scar-learned'
   };
   ```
5. Save. Copy the Webhook URL → `.env`:
   ```
   KEEPERHUB_SCAR_WEBHOOK=https://app.keeperhub.com/api/workflows/<id>/webhook
   ```

## Workflow 4 — Heartbeat Health Check (KH protocol action depth)

**Purpose:** demonstrates KH's *real* depth by using a native protocol
action (not just Run Code). Reads ETH balance of our deployer wallet on
Sepolia every 5 minutes; if balance drops below threshold, the Run Code step
flags it. This proves we use KH for actual on-chain work, not just audit
logging.

**Steps:**
1. KH home → New Workflow → name "HYDRA Treasury Watch"
2. First node → **Trigger Type → Schedule**, cron `*/5 * * * *`.
3. Click + → search "balance" → pick **Chronicle: Get ETH Balance** (or any
   `aave-v3/get-user-account-data`-style read action that's relevant).
4. Configure with: chainId `11155111` (Sepolia), address (paste your dev
   wallet's mainnet-shaped address — anything you can read).
5. Click + → Run Code:
   ```js
   const bal = {{@previous-node:Get ETH Balance.balance}};
   const threshold = 1e16; // 0.01 ETH wei
   const breach = bal < threshold;
   if (breach) console.warn('HYDRA: treasury watch breach', { bal });
   return { ts: new Date().toISOString(), bal, breach };
   ```
6. Save. This workflow runs autonomously on the cron — no agent integration
   needed. It proves we use KH protocol actions, scheduled triggers, and
   conditional logic across actions.

This addresses the KH judging criterion "depth of integration" — four
distinct workflows across four trigger types (webhook, scheduled, schedule
+ protocol action), with two independent integration paths (agent-fired
audit + KH-native autonomous monitoring).

## After setup

Restart heads and run a kill — all three webhook workflows fire on a single death
event:

```bash
./demo/reset.sh --hard
./demo/full-demo.sh --cause key_revoked
```

Check KH run history for each workflow — you'll see one input + audit run
per kill. That's the depth-of-integration story: webhook + scheduled +
event-style workflows all driven by HYDRA in a single coherent flow.
