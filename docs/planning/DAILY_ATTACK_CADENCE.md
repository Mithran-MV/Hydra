# Daily attack cadence — D5 → D9 (compressed to May 3 submission)

**Goal:** by submission morning (May 3 / D10), the live deployment has accumulated:
- 4+ scars covering all four cause types
- Generation counter at gen-2 or gen-3
- 12+ KeeperHub workflow runs
- At least one **defended** attack (scar-enforced) — the punchline that proves "you can't kill what evolves from pain"
- Visible 5-day evolution that competitors with single-snapshot demos cannot match

**Why daily:** sponsor reviewers spend < 1 minute per project on first pass. If the dashboard shows a visibly evolving swarm with five days of recorded attack history, that beats a static screenshot of "3 heads alive, never attacked." It also gives a credible answer to the "is this still running?" question that judges sometimes ask.

**Submission deadline:** May 3 morning (TZ TBD). All attacks + demo recording + AI_USAGE + final docs must land by end of D9 (May 2 night). Buffer is the few hours of D10 morning.

---

## Schedule

| Day | Date | Action | Cause | Target | Expected outcome |
|---|---|---|---|---|---|
| D5 | Apr 28 | Attack #1 ✓ | `process_killed` | h2 (univ4_lp) | killed → resurrected · 1st scar of cause |
| D5 | Apr 28 | Attack #2 ✓ | `wallet_drained` | h1 (aave_deposit) | killed → resurrected · 1st scar of cause (caught 3 bugs in path before firing — see `docs/ADVERSARIAL_TESTING.md`) |
| D6 | Apr 29 | Attack #3 | `api_timeout` | h3 (payroll) | killed → resurrected · 1st scar of cause |
| **D7** | **Apr 30** | **Build day — ship scar-enforced defense** + Attack #4 | `key_revoked` (post-soft-reset of h2) | revived h2 | killed → resurrected · final cause covered (all four scar types now in the registry) |
| D8 | May 1 | Attack #5 (defense proof) + record demo | `wallet_drained` | h1 | **defended (scar from #2)** if D7 build shipped — captured on camera as the demo's punchline |
| D9 | May 2 | Final polish: AI_USAGE.md update, README scrub, X handles, screenshot capture, soft submit | — | — | submit form filled, video uploaded, all docs in final state |
| D10 morning | May 3 | Hard deadline · final submission | — | — | hit submit before TZ-confirmed cutoff |

Each "killed → resurrected" row produces 5 fresh on-chain tx hashes (death / scar / iNFT mint / 2 born). Each "defended" row produces 1 tx (the blocked-attempt event) + 0 new born / 0 new scar mint — proving the swarm's accumulated immunity.

Every attack gets one row appended to `README.md`'s "Live attacks captured" table, incremental, one commit per attack. Per-attack journalctl traces under `docs/attacks/`.

**Cuts vs. the original D5–D11 plan:** the D9 double-kill stress test is dropped (it was a "Shot 7" demo flourish, not load-bearing — five attacks across four cause types is enough variety). The D10 hard-reset + repeat attack is dropped (was meant to demo the second cause's defense; D8's defended attack #5 already covers that beat). Demo recording moves from D11 → D8 so D9 is pure polish + submit prep. Buffer collapses from D13 → D10 morning only.

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

Last updated: 2026-04-28 (D5, attacks #1 + #2 captured · 2 of 4 scar causes represented · cadence compressed to D5–D9 after submission deadline confirmed as May 3 morning).
