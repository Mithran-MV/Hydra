# Decision: Building HYDRA

**Date:** 2026-04-23 (day before kickoff)
**Selected idea:** HYDRA — anti-fragile agent swarm
**Rejected idea:** ALCHEMIST — multi-hop dead-pool routing
**Sponsors targeted:** KeeperHub + Gensyn AXL + 0G ($6,750 primary target, $9,250 with Uniswap stretch)

---

## Why HYDRA over ALCHEMIST

### 1. Buildability (12 days)
ALCHEMIST requires solving cross-chain atomic multi-hop swaps — a research-level problem. It also needs accurate liquidity data across 5+ DEXes and bridges. Either of those alone is a month of work. HYDRA reduces to bounded engineering problems: heartbeat (trivial), consensus (simple Byzantine-lite), process spawning (Docker or node processes), and SDK calls to 0G + KeeperHub. Every HYDRA component has a clear "done" state.

### 2. Judging criteria fit
KeeperHub says: "Would someone actually use it?" Every protocol running keeper agents has exactly the problem HYDRA solves. "One keeper goes down, the system degrades" is a universal pain point. ALCHEMIST answers "would someone use 7-hop routes through dead pools?" with "institutional desks will not trust it" — the utility story is weaker.

AXL qualification requires "cross-node communication." HYDRA's concept *literally requires* decentralized heartbeat/consensus — a centralized watchdog defeats the whole idea. In ALCHEMIST, AXL is the chosen transport but a central route index would technically work, which makes the integration feel decorative to judges.

### 3. Demo in 2-3 minutes
HYDRA's demo is kinetic and self-explanatory: "Watch me kill it. It grows back. It got smarter." Heads multiplying on screen is a visceral image anyone understands. ALCHEMIST's demo ends on "3% savings" — a number. Numbers don't move emotions; hydras growing new heads do.

### 4. Sponsor integration depth
HYDRA makes all three sponsors load-bearing, not decorative:
- **KeeperHub**: 7 features used (execution, tx simulation, retry, private routing, audit trail, emergency redistribution, scheduled triggers)
- **AXL**: heartbeat, consensus, resurrection coordination, scar broadcast — 4 distinct inter-node protocols, each on separate nodes
- **0G**: Storage (KV for state, Log for history, scar registry) + Compute (agent inference for spawned children) — both primitives used meaningfully

### 5. Uniqueness in the submission pool
Anti-fragility applied to on-chain agents is genuinely unprecedented. No past ETH Global finalist. No direct analogue in crypto. The conceptual frame (Taleb) is recognizable to sophisticated judges without being overused. ALCHEMIST is aggregator-adjacent territory — judges have seen "better routing" pitches before.

### 6. Risk profile
HYDRA's risks are *execution* risks: making "death" visible, polishing the D3 visualization, wiring 3 sponsors together. All solvable with time. ALCHEMIST's risks are *feasibility* risks: maybe the cross-chain atomicity doesn't work, maybe dead pools don't have the data quality, maybe the 3% savings doesn't hold up. Feasibility risk can kill a project mid-build. Execution risk can be shipped around.

---

## Prize stack

| Track | Prize | Strategy |
|---|---|---|
| KeeperHub 1st | $2,500 | Deep 7-feature integration, "mergeable quality" README |
| AXL 1st | $2,500 | Cross-node heartbeat + consensus, separate AXL nodes per head |
| 0G Best Autonomous Agents | $1,500 | Swarm with 0G Storage memory + 0G Compute inference |
| KeeperHub Feedback Bounty | $250 | Specific, reproducible feedback in FEEDBACK.md |
| **Primary total** | **$6,750** | |
| Uniswap (stretch) | $2,500 | Heads LP on Uniswap v4, FEEDBACK.md |
| **Stretch total** | **$9,250** | |

---

## What we're explicitly NOT doing

- **Not trying cross-chain.** Single chain (0G Chain). Simplifies everything.
- **Not building complex DeFi strategies.** Each head manages one boring position (Aave deposit, simple LP, scheduled transfer). The demo wow is resurrection, not trading alpha.
- **Not doing iNFT for scars in v1.** Nice stretch goal but not core.
- **Not auto-generating LLM scar rules.** Scar = hardcoded rule template per death cause. Keeps demo deterministic.
- **Not supporting arbitrary attack types.** Four concrete kill types: key revocation, process kill, API timeout, wallet drain. Each has a pre-built scar.
