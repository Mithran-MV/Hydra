# KeeperHub Builder Feedback

ETH Global Open Agents Hackathon · April 24 – May 6, 2026
Project: HYDRA · Builder: Mithran M.V. <mithran07.mv@gmail.com>
KeeperHub workflow used: `lcyuk85gh46defy5xaq8b` (HYDRA Emergency Redistribute)

This is HYDRA's submission to the **KeeperHub Builder Feedback Bounty**. The
feedback is specific, reproducible, and includes suggested fixes — it is not
generic praise.

---

## TL;DR — what worked, what didn't

| Area | Verdict |
|---|---|
| MCP onboarding (`claude mcp add ...` → `/mcp`) | ✅ excellent — one-liner, browser auth, productive in <2 min |
| `mcp__keeperhub__list_action_schemas` (396 actions, 5 trigger types) | ✅ excellent — discoverable, well-typed |
| `mcp__keeperhub__execute_workflow` | ✅ works flawlessly with the Bearer token |
| Web workflow editor (drag-drop, properties panel) | ✅ intuitive for first-time users |
| Public webhook URL with API key auth | ❌ **broken** — see B-1 below |
| `mcp__keeperhub__create_workflow` from MCP token | ❌ 401 — see B-2 below |
| Chain support for non-listed EVMs (e.g. 0G Galileo 16602) | ❌ undocumented — see G-1 below |
| Code action template variable validation | ⚠️ minor — see U-1 below |

Five concrete entries below. Each has reproduction steps, expected vs actual
behavior, and a suggested fix.

---

## B-1 · Webhook public URL rejects the org API key

**Severity:** high — blocks integration, forces builders to use undocumented MCP backdoor

**What happened**

1. Created workflow `HYDRA Emergency Redistribute` (id `lcyuk85gh46defy5xaq8b`) with a Webhook trigger via the workflow editor.
2. Copied the displayed Webhook URL: `https://app.keeperhub.com/api/workflows/lcyuk85gh46defy5xaq8b/webhook`
3. Generated an API key via Setup Guide → "Generate API Key" → got a 35-char `kh_hw5...` style token.
4. Tried POSTing to the webhook URL with `Authorization: Bearer <key>`.

**Expected:** webhook fires the workflow, returns 200 + a run ID, payload appears in run history.

**Actual:** every attempt returns `401 Unauthorized`:

| Auth scheme | Response |
|---|---|
| `Authorization: Bearer <key>` | `{"error":"Invalid API key format"}` |
| `Authorization: <key>` | `{"error":"Invalid API key format"}` |
| `x-api-key: <key>` | `{"error":"Missing Authorization header"}` |
| `Api-Key: <key>` | `{"error":"Missing Authorization header"}` |

**Workaround we shipped:** since `mcp__keeperhub__execute_workflow` works perfectly with the same Bearer token, our agent triggers the workflow via the MCP transport. This works — proven by `runId wrun_01KQ6P4BWN9HXZDX0Z5YFXER4V` in our run history — but feels like an undocumented backdoor and won't work for non-MCP integrators.

**Suggested fix**

1. Document the **expected key format** in the API key generation dialog. If the format is e.g. `kh_org_<id>_<secret>` (64+ chars), say so + show an example curl.
2. Make the error message specific: `"Invalid API key format — expected 'Bearer kh_org_<id>_<secret>' (64+ chars)"` instead of just `"Invalid API key format"`.
3. Consider a per-workflow webhook signing secret (Stripe-style) distinct from the org API key, surfaced in the workflow's webhook trigger panel.

**Reproduce:** run `curl -s -X POST "https://app.keeperhub.com/api/workflows/lcyuk85gh46defy5xaq8b/webhook" -H "Authorization: Bearer kh_<your_key>" -d '{}'` after generating an API key from the same org.

---

## B-2 · MCP token's write scope is not what the consent screen suggests

**Severity:** medium — blocks programmatic workflow creation

**What happened**

1. Connected KH MCP via `claude mcp add --transport http keeperhub https://app.keeperhub.com/mcp`.
2. Authorized via `/mcp` browser flow.
3. **Read operations work:** `list_workflows`, `list_action_schemas`, `get_workflow`, `execute_workflow`, `get_execution_status`, `get_execution_logs` all succeed.
4. **Write operations fail:** `create_workflow`, `update_workflow`, `delete_workflow`, `ai_generate_workflow` all return `401 Unauthorized`.

**Expected:** the `/mcp` browser consent grants both read AND write on workflows (that's the natural scope for a builder MCP).

**Actual:** consent appears to only grant read. There's no scope toggle in the consent screen, and no obvious way to upgrade — re-running `/mcp` re-uses the same token.

**Workaround we shipped:** created the workflow manually in the web UI. Painful for repo-as-source-of-truth (we'd love to commit the workflow JSON and `pnpm kh:apply` it).

**Suggested fix**

1. Show requested scopes explicitly on the consent screen ("KeeperHub wants to: read workflows, create/update/delete workflows, execute workflows").
2. Default to read+write for MCP integrations — that's the productive baseline.
3. Add `mcp__keeperhub__sync_workflow_from_file` so we can keep workflow JSON in our repo and reconcile on push.

**Reproduce:** after `/mcp` auth, try any write op via MCP — they all 401.

---

## G-1 · Chain support is undocumented for new EVMs

**Severity:** medium — forces architectural workarounds

**What happened**

1. HYDRA targets 0G Galileo testnet (chain id 16602) — listed prominently on `chainscan-galileo.0g.ai`, has been live for months.
2. We needed KeeperHub workflows to read/write our HydraTreasury contract on 0G.
3. Called `mcp__keeperhub__list_action_schemas` with `includeChains: true`. Got back 22 chain IDs: 1, 56, 97, 101, 102, 103, 137, 4217, 8453, 9745, 9746, 11155111, 42161, 42429, 43113, 43114, 80002, 84532, 421614… **0G chain IDs (16602) are not present.**
4. No documentation explains how to add a custom chain, or whether `Read Contract` / `Write Contract` actions accept arbitrary RPC URLs.

**Expected:** any of: (a) 0G Chain in the list, (b) a documented "custom RPC" path, (c) a chain-config workflow in the UI.

**Actual:** no path forward via KH-native chain actions. We architected around it: agents make the on-chain writes directly via viem to 0G, KH workflow's role is reduced to webhook-triggered audit logging via Run Code action.

**Suggested fix**

1. Add a "Supported chains" page in docs with the full list, last-updated timestamp, and the criteria for adding a chain.
2. Expose a "Custom RPC" config field for `Read Contract` / `Write Contract` actions — chain ID + RPC URL + (optional) explorer. Let builders BYO chain.
3. For the hackathon ecosystem specifically: prioritize hackathon-sponsor chains (0G is a co-sponsor of this exact event).

---

## U-1 · Run Code action: `{{...}}` template syntax fails the JS validator

**Severity:** low — cosmetic, but blocks save until worked around

**What happened**

1. Added a Run Code action with the documented template syntax: `const body = {{@trigger:HYDRA Death Webhook.body}};`.
2. The editor's TS/JS validator immediately flagged it: `Declaration or statement expected. (1128)` — and the **Save** button was disabled.

**Expected:** editor either accepts `{{...}}` as a known templating directive, or strips it before validating (since substitution happens at runtime).

**Actual:** TS validator runs as if the file is plain TypeScript, so `{{...}}` is a parse error. There is no way to disable validation.

**Workaround we shipped:** rewrote the Run Code body without template syntax (`console.log('death received')` plus a static return). Loses the inline payload reference, but the payload is in run history input regardless.

**Suggested fix**

1. Pre-process `{{...}}` away before TS validation — show a visual chip ("→ trigger.body") instead.
2. Add a "Disable validation" toggle in the code editor advanced settings.
3. Surface the documented template variants (`{{NodeName.field}}` vs `{{@nodeId:Label.field}}`) inline in an autocomplete menu.

---

## P-1 · Things that worked surprisingly well

Listing these so the team knows what NOT to change:

1. **MCP setup is best-in-class.** `claude mcp add --transport http keeperhub https://app.keeperhub.com/mcp` followed by browser consent in `/mcp` is the smoothest MCP onboarding I've used. Other MCP tools require local processes, port wrangling, manual config files. KH gets it right.
2. **Action schema discoverability.** `list_action_schemas` returns 396 actions across 22 chains with full inputs/outputs/required-credentials metadata. Made it possible to build the agent's chain-call surface without trial-and-error.
3. **Run history with full input/output capture.** When `execute_workflow` succeeds, the resulting run history is genuinely the audit trail you want — not just timestamps but every node's input, output, logs, errors, duration. Beautifully done.
4. **Setup Guide on the home dashboard.** The "Generate API Key" / "Create a Workflow" / "Create Wallet" guide with progress bar is the right onboarding pattern for blockchain-curious devs who don't yet know what to click.
5. **Speed of workflow creation.** From "logged in for the first time" to "workflow created with webhook + Run Code" took under 90 seconds in the UI. That's hard to beat.

---

## Total time budget on this bounty

- Discovery + first integration attempt: **30 min**
- Bug isolation (B-1, B-2 reproduction): **45 min**
- Workaround shipping (MCP-execute + manual workflow): **20 min**
- Writing this feedback: **40 min**

About 2 hours on KeeperHub directly across the build window. The platform stayed out of our way once we routed around the auth gaps — that's the highest praise a builder can give a hackathon sponsor.
