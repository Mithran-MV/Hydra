# HYDRA — 12-day build plan

**Window:** April 24 – May 6, 2026 (13 days total, plan uses 12 + 1 buffer)
**Working solo, Next.js + Claude Code.**

**Cadence:** each day has a **morning goal**, an **evening goal**, and a **shippable checkpoint** you can demo to yourself. If a day's checkpoint isn't green by end of day, STOP adding scope tomorrow — fix before moving on. Falling behind compounds.

---

## Pre-kickoff — Thursday April 23 (today, evening)

Don't start building. Do the 2-hour setup tax so day 1 is productive.

- [ ] Clone AXL: `git clone https://github.com/gensyn-ai/axl`
- [ ] Build AXL binary, run one instance on localhost:9002, hit `/health`
- [ ] Generate three ed25519 keys: `openssl genpkey -algorithm ed25519 -out key-{1,2,3}.pem`
- [ ] Sign up for KeeperHub, create an API key, read the MCP docs end-to-end
- [ ] 0G Chain testnet RPC + faucet — send yourself test ETH
- [ ] 0G Storage: confirm SDK installs, write + read one KV entry
- [ ] 0G Compute: read the quickstart, run one inference call
- [ ] Create empty GitHub repo `hydra-swarm` (public), commit just the README scaffold

**Checkpoint:** all four external sponsor systems respond to a trivial request from your machine. If any don't, solve that today — those blockers are 10x more expensive mid-build.

---

## Day 1 — Friday April 24 — Foundation + 2 heads pinging

**Morning**
- `npm init -w agents -w web -w contracts` monorepo
- Commit `shared/types.ts` and `shared/constants.ts` (copy from ARCHITECTURE.md)
- `agents/src/identity.ts` — load or generate ed25519 key; derive headId as hash of pubkey
- `agents/src/axl/client.ts` — thin wrapper around `POST /send`, `GET /peers`, `POST /mcp/{peer}/{service}`

**Evening**
- `agents/src/head.ts` entrypoint: loads identity, connects to its AXL node, prints "Head ${id} alive"
- `docker-compose.yml`: service `head-1` + sidecar `axl-1`, service `head-2` + sidecar `axl-2`
- Boot both; confirm they discover each other via AXL `/peers`

**Checkpoint:** `docker compose up` → two heads log `peer discovered: ${otherId}`. Screenshot it.

---

## Day 2 — Saturday April 25 — Heartbeat + 3rd head + dashboard skeleton

**Morning**
- `agents/src/heartbeat.ts` — every 3s, each head broadcasts `{type: "heartbeat", from, gen, ts, sig}` to every known peer
- Ed25519 sign the heartbeat payload; receiver verifies sig against known pubkey
- Add `head-3` to docker-compose; confirm all three pair-wise exchange heartbeats

**Evening**
- `web/app/page.tsx` — Next.js scaffold with shadcn installed
- `web/app/api/events/route.ts` — SSE endpoint that agents push to (or a Redis bridge; keep simple — a single in-memory broker in web layer is fine for demo)
- Primitive UI: three circles, green = recent heartbeat, yellow = stale

**Checkpoint:** dashboard shows 3 green circles that stay green while docker is up. Refresh shows current state.

---

## Day 3 — Sunday April 26 — Death detection + consensus

**Morning**
- `agents/src/consensus.ts` — track `lastSeen[peerId]` map; if `now - lastSeen > 15s`, broadcast `{type: "suspect", target}`
- Each head counts suspicions for each target; if count ≥ ceil(N/2), broadcast `{type: "confirmed", target, cause}`
- Cause detection heuristic: if the head exited from process signal → `process_killed`; if we got a revoke event → `key_revoked`; else `api_timeout` as default

**Evening**
- Dashboard: update circles to show `suspected` (yellow pulse) → `dead` (red with X)
- Add EventLog component: right-hand scroll of every consensus message

**Checkpoint:** `docker stop hydra-head-2` → within ~20s, dashboard shows head-2 yellow, then red. Event log shows "suspected" → "confirmed".

---

## Day 4 — Monday April 27 — 0G Storage memory

**Morning**
- `agents/src/memory/og-kv.ts` — write `head-{id}/state` every 10s (current HeadState blob)
- `agents/src/memory/og-log.ts` — append `head-{id}/events` on every decision
- Verify: kill a head, read its last KV from 0G Storage via standalone script

**Evening**
- Dashboard: for each head card, show "last snapshot" timestamp + link to 0G explorer
- Add `scars/global` KV read — currently empty array

**Checkpoint:** kill head-2, refresh page, click "view memory" → sees last state JSON retrieved from 0G.

---

## Day 5 — Tuesday April 28 — Resurrection (the moneyball day)

**Morning**
- Leader election: on `confirmed` event for X, all live heads pick the live head with lowest numerical id as leader; that leader broadcasts `{type: "resurrect", target: X, leader: me}` and starts work
- `agents/src/resurrection.ts` — leader spawns two child processes (use `child_process.spawn` in dev; `docker compose up head-N` in prod setup)
- Children generate fresh ed25519 keys, read parent state from 0G on boot
- Children broadcast `{type: "born", parent, scar: null}` on entry to mesh

**Evening**
- Dashboard: animate 3 → 4 transition — dead head fades red, two child nodes fade in purple ("newborn") then green
- Generation counter increments
- Event log: clear narrative ("Head 2 died → leader head-1 elected → spawning 2a + 2b → 2a born → 2b born")

**Checkpoint:** kill head-2 → watch dashboard transition 3 → 4 heads. This is the first time the demo works end-to-end.

---

## Day 6 — Wednesday April 29 — Scars (the emotional payoff)

**Morning**
- `agents/src/scars.ts` — lookup table: `deathCause → Scar` (hardcoded rules, see ARCHITECTURE.md)
- On confirmed death, leader writes new Scar to `scars/global` on 0G
- Broadcasts `{type: "scar", scar}` to mesh; all heads update their local cache
- Children on birth read `scars/global` and apply mitigations (for demo: just display them; no need to actually harden)

**Evening**
- Dashboard: ScarTimeline component at bottom — horizontal cards showing learned defenses, each with timestamp + cause icon + rule text
- Kill a second head with a DIFFERENT cause (`key_revoked` vs `process_killed`) — should produce a different scar

**Checkpoint:** two kills → two distinct scars visible. Third kill of a different type → third scar. Scars persist across a full docker restart (read from 0G).

---

## Day 7 — Thursday April 30 — KeeperHub + simple DeFi

**Morning**
- `agents/src/execution/keeperhub.ts` — wrap KeeperHub API (or MCP if you're set up for it) — method `submit(txRequest, options)`
- `agents/src/execution/strategies/aave.ts` — single method `maintainDeposit(amount)` that calls keeperhub.submit with Aave supply data
- Wire head-1 to run Aave strategy, head-2 UniV4 (can stub this call, just needs to appear on-chain), head-3 Payroll

**Evening**
- Each head calls its strategy method every 30s; KeeperHub logs show tx simulations + executions
- Dashboard: each head card shows current position + P&L (can be trivial — balance snapshot diff)

**Checkpoint:** docker up → KeeperHub dashboard shows 3 heads transacting on 0G Chain testnet. Audit trail visible.

---

## Day 8 — Friday May 1 — KeeperHub emergency redistribution

**Morning**
- Deploy `HydraTreasury.sol` + `HydraExecutor.sol` + `HydraRegistry.sol` to 0G Chain testnet
- Update agents to call `treasury.executeFromHead` via KeeperHub for all actions
- Seed the treasury with test tokens, allocate to each head

**Evening**
- On confirmed death: leader calls `treasury.redistribute(deadHead, [child1, child2], tokens, [5000, 5000])` via KeeperHub
- KeeperHub: `simulate: true`, `retry: 3`, `private: true`, `auditTag: "emergency-${deadHead}"`
- Dashboard: redistribution animation — show asset "droplet" flowing from dead head node to child nodes

**Checkpoint:** kill head-2 with $ position → watch on-chain redistribute tx → children are funded. All through KeeperHub, no direct RPC.

---

## Day 9 — Saturday May 2 — 0G Compute + iNFT stretch

**Morning**
- `agents/src/memory/og-compute.ts` — route child heads' first decision call to 0G Compute
- Decision = boolean "should I rebalance now?" — trivial inference, but it runs on 0G Compute, which is what the track asks for
- Fall back to local inference if 0G Compute is flaky (wrap in try/catch with 3s timeout)

**Evening (optional — only if ahead of schedule)**
- iNFT track stretch: mint a "Scar iNFT" per learned defense on 0G Chain
- Each Scar's `ruleURI` points to 0G Storage JSON; metadata includes generation + cause
- Link minted iNFT in README for the 0G iNFT sub-track

**Checkpoint:** spawn a child → see 0G Compute tx in 0G explorer. If iNFT done: one minted iNFT visible on 0G explorer.

---

## Day 10 — Sunday May 3 — Visualization polish (the make-or-break day)

**Morning**
- Replace primitive circles with D3 force-directed graph
- Heartbeats = pulsing edges
- Color states crisp: healthy green, suspected yellow pulse, dead red fade, resurrecting blue, newborn purple fade-in
- Framer Motion transitions on state changes

**Evening**
- Header stats: generation counter, head count, scar count, total deaths, cumulative P&L
- Floating KillControls panel: buttons for each kill type
- ScarTimeline: make it scroll, add icons per cause, hover to see full rule
- Run through a full demo kill sequence; fix anything that looks janky

**Checkpoint:** full sequence (3 → kill → 4 → kill → 5 → double-kill → 5 with 3 scars) looks satisfying on screen. You'd watch it yourself.

---

## Day 11 — Monday May 4 — Demo recording

**Morning**
- Rehearse the demo narration out loud 3x before hitting record (see DEMO_STORYBOARD.md)
- Clean reset script: wipe 0G KV, restart docker, reset UI to pristine 3-head state
- Run `kill-sequence.sh` to ensure scripted kills fire reliably

**Afternoon**
- Screen record at 1080p60 or 1440p (QuickTime or Loom). Record 3-5 takes.
- Record voiceover separately — better audio control
- Edit in DaVinci Resolve or Descript. Target 2:45. Hard cap 3:00.
- Add captions (0G track rewards accessibility, and judges sometimes watch muted)

**Evening**
- Upload to YouTube unlisted + store MP4 in repo under `demo/`
- Get one external person to watch it silently — if they can't follow, re-edit

**Checkpoint:** shipped demo video ≤ 3 min, uploaded to YouTube, linked in README.

---

## Day 12 — Tuesday May 5 — README, FEEDBACK.md, write-up

**Morning**
- README.md: project summary, architecture diagram (copy from ARCHITECTURE.md), setup (`docker compose up`), sponsor attribution section, contract addresses, demo video embed, team info
- Architecture diagram as actual PNG or mermaid (looks nicer than ASCII in README)
- FEEDBACK.md: specific, reproducible KeeperHub feedback — what worked, what confused you, one specific doc gap or bug with repro steps. Target the $250 bounty.

**Afternoon**
- Write the 1-page write-up ("How KeeperHub is used"): emergency redistribution narrative, 7 features list, why the swarm needs a reliable execution layer
- 0G write-up: how the swarm coordinates (heartbeat → consensus → resurrection), what each 0G primitive provides
- AXL write-up: which messages flow over AXL, why centralized alternatives fail for anti-fragility

**Evening**
- Submit to KeeperHub, AXL, 0G (Autonomous Agents & iNFT if applicable)
- Triple-check: GitHub public, README complete, demo link works, contract addresses correct

**Checkpoint:** all three submissions filed.

---

## Day 13 — Wednesday May 6 — Buffer

Don't add features. Use today only for:
- Bug fixes discovered after submission
- Responding to sponsor Telegram questions
- Re-submitting with fixed links if broken

If nothing's on fire: take the afternoon off. You'll need it mentally for the judging window.

---

## Rules of the build

1. **End-of-day checkpoint is non-negotiable.** Miss it → don't start tomorrow's scope until it's green.
2. **Don't refactor until Day 10.** Ugly working code > clean broken code.
3. **Don't add features past Day 9.** Days 10-12 are polish + demo + submit. No exceptions.
4. **If 0G Compute is flaky at demo time, fall back to local inference.** The storytelling is that children spawn in a verifiable compute layer — if the API is down during recording, cache one successful call and show it in the recording.
5. **If KeeperHub is flaky, use the audit trail screenshot as the demo evidence.** Don't let infra flakiness tank the demo.
6. **Rehearse the demo 3x before recording.** Every time.
7. **One feature per commit.** Makes it easy to revert if something breaks.
8. **Leave `main` always-green.** Feature branches for anything risky.
9. **README is the judge's first impression.** Budget real time on Day 12.

---

## Cut list (if behind schedule)

In this order — cut from the bottom up:

1. iNFT scar minting (Day 9 stretch) → just describe in README
2. 0G Compute for children → use local inference, mention Compute in write-up as "next step"
3. UniV4 LP strategy → replace with a second Aave vault
4. Private routing through KeeperHub → use basic routing
5. Framer Motion polish → use CSS transitions
6. ScarTimeline interactions → static cards

Never cut:
- Cross-node AXL heartbeat (AXL qualification)
- KeeperHub execution (KeeperHub qualification)
- 0G Storage memory inheritance (0G qualification + the whole narrative)
- Kill → resurrection visible in demo (the whole pitch)
