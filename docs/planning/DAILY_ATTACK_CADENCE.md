# Daily attack cadence — D5 → D11

**Goal:** by demo day (D11, May 4), the live deployment has accumulated:
- 6+ scars (one per kill, all four causes represented at least once)
- Generation counter at gen-3 or gen-4
- 18+ KeeperHub workflow runs
- A real (non-staged) "double-kill stress test" matching demo storyboard Shot 7
- Visible week-of-evolution that competitors with single-snapshot demos cannot match

**Why daily:** sponsor reviewers spend < 1 minute per project on first pass. If the dashboard shows a visibly evolving swarm with a week of recorded attack history, that beats a static screenshot of "3 heads alive, never attacked." It also gives a credible answer to the "is this still running?" question that judges sometimes ask.

---

## Schedule

| Day | Date | Action | Cause | Target | After-state |
|---|---|---|---|---|---|
| D5 | Apr 28 | Attack #1 | `process_killed` | h2 (univ4_lp) | gen 1 · 4 heads · 1 scar (done) |
| D5 | Apr 28 | Attack #2 (+30 min) | `wallet_drained` | h1 (aave_deposit) | gen 1 · 5+ heads · 2 scars |
| D6 | Apr 29 | Attack #3 | `api_timeout` | h3 (payroll) | gen 1 · 6+ heads · 3 scars |
| D7 | Apr 30 | Soft reset + Attack #4 | `key_revoked` | reset h2 | gen 1 · 4 heads · 4 scars (full cause set) |
| D8 | May 1 | Attack #5 | `wallet_drained` | h1 | gen 1-2 · 5 heads · 4 scars |
| D9 | May 2 | **Double-kill** stress test | `api_timeout` × 2 | h2 + h3 | gen 2 · 6 heads · 4 scars (Shot 7 capture) |
| D10 | May 3 | Hard reset + Attack #6 | `process_killed` | h2 | gen 1 · 4 heads · 4 scars (clean state for demo) |
| D11 | May 4 | (no attack) | — | — | record demo video on D10's clean post-attack state |

Each row produces a fresh scar broadcast to the swarm and 5 fresh on-chain tx hashes (death / scar / iNFT mint / 2 born). Each gets appended to `README.md` as a row in the "Live attacks captured" table — incremental, one commit per attack.

---

## Reset semantics

**Soft reset (D7):** `systemctl start hydra-head2.service` — brings the SIGTERM-stopped original back online. Children spawned by the previous resurrection keep running as orphan child processes; they don't die. The swarm gets back the original head's identity.

**Hard reset (D10):** `./demo/reset.sh --hard` on server — kills all dynamically-spawned children (h4+), wipes `events.jsonl`, restores baseline. Generation counter resets to 0 for all surviving heads. Used right before demo recording to give a clean slate.

Between resets, the swarm naturally accumulates orphan children. The dashboard's "head count" climbs. This is the visible evolution — competitors with single-day demos can't fake it.

---

## Cause variety target

By D7 we want all four scar causes represented at least once:
- `process_killed` (D5, captured)
- `wallet_drained` (D5 attack #2)
- `api_timeout` (D6)
- `key_revoked` (D7)

Beyond D7, the cycle repeats with whichever cause maps to the strategy under attack.

To force a specific cause, use `./demo/kill.sh <head-index> --cause <cause>` — the script broadcasts a panic message with the requested cause before issuing SIGTERM. Per the consensus.handlePanic logic, the first panic wins, so the cause attribution is deterministic.

---

## Failure modes + recovery

- **Cron firing fails** — manual catch-up next session. The cadence isn't load-bearing for a single missed day; we just lose one row of variety.
- **Resurrection fails on chain** — known cause is the deployer-wallet OG balance dropping under gas threshold. `chainscan-galileo` shows nonce stalls. Top up wallet, re-run.
- **AXL mesh becomes orphan-heavy** (>10 heads) — hard reset earlier than planned.
- **Dashboard shows stale data** — `systemctl restart hydra-web.service`. SSE reconnects within seconds.

---

## Status

This file is updated by hand after every attack. The README's "Live attacks captured" section is the canonical proof block — these notes are the *plan*, the README rows are the *receipts*.

Last updated: 2026-04-28 (D5, attack #1 captured).
