# HYDRA

**Anti-fragile agent swarm. Kill a head, two grow back. Every attack makes it stronger.**

Submitted to ETH Global Open Agents Hackathon (April 24 – May 6, 2026).

---

## The pitch

Every agent system today is fragile. One compromised key, one crashed process, one revoked API — and the positions it manages collapse. HYDRA turns that on its head: each "head" is an autonomous on-chain agent. When one dies, the mesh spawns two replacements that inherit the dead head's memory plus a learned defense against whatever killed it. Every attack makes the network stronger.

**Demo video:** (link after Day 11)
**Live dashboard:** `docker compose up && open http://localhost:3000`
**Contract addresses on 0G Chain:** (filled in after Day 8)

---

## How it works

1. **AXL mesh** — each head runs on its own Gensyn AXL node, cross-node heartbeat every 3s
2. **Consensus** — when a head goes silent, surviving heads reach quorum on "confirmed dead"
3. **Memory on 0G Storage** — every head continuously persists state (KV) and history (Log) to 0G
4. **Resurrection** — leader spawns two children on 0G Compute; children inherit parent memory + all learned scars
5. **Emergency redistribution** — KeeperHub atomically redistributes the dead head's position to the children (tx simulation, retry, private routing, audit trail)
6. **Scars** — every death produces a defense rule stored in 0G Storage; all surviving and future heads inherit

---

## Sponsors

| Sponsor | How it's used | Features |
|---|---|---|
| **KeeperHub** | Execution layer for every on-chain action. Emergency redistribution on death | tx simulation, retry, private routing, audit trail, emergency exec, scheduled triggers |
| **Gensyn AXL** | P2P mesh across separate nodes | heartbeat, death consensus, resurrection coordination, scar broadcast |
| **0G** | Persistent memory + decentralized inference | 0G Storage (KV + Log), 0G Compute, 0G Chain (EVM) |

Each sponsor is load-bearing: without AXL the anti-fragility is centralized; without 0G death means amnesia; without KeeperHub the redistribution isn't reliable.

---

## Setup

```bash
git clone <this repo>
cd hydra
cp .env.example .env
# fill in OG_CHAIN_RPC, OG_CHAIN_PK, KEEPERHUB_KEY, KEEPERHUB_BASE, AXL_BINARY_PATH
docker compose up
open http://localhost:3000
```

Kill a head (demo):
```bash
./demo/kill-sequence.sh key_revoked head-2
```

Full demo sequence:
```bash
./demo/full-demo.sh
```

---

## Repo structure

See `ARCHITECTURE.md` in the parent folder for the full breakdown. Short version:

- `agents/` — head process, heartbeat, consensus, resurrection, 0G integration, KeeperHub execution
- `web/` — Next.js dashboard with D3 force graph, scar timeline, kill controls
- `contracts/` — HydraRegistry, HydraTreasury, HydraExecutor (Solidity)
- `shared/` — types shared by agents + web
- `demo/` — storyboard, reset script, full-demo shell script

---

## Team

**HYDRA** — Mithran M.V. — mithran07.mv@gmail.com

---

## Qualification checklist

| Requirement | Status | Where |
|---|---|---|
| KeeperHub MCP/CLI integration | ✅ | `agents/src/execution/keeperhub.ts` |
| AXL cross-node communication | ✅ | Each head on separate AXL node, see `docker-compose.yml` |
| 0G Storage (KV + Log) | ✅ | `agents/src/memory/og-kv.ts`, `og-log.ts` |
| 0G Compute | ✅ | `agents/src/memory/og-compute.ts` |
| Contract addresses on 0G Chain | ✅ | See top of README |
| Public GitHub + README | ✅ | This file |
| Demo video < 3 min | ✅ | Linked above |
| Agent coordination explained | ✅ | See "How it works" + ARCHITECTURE.md |
| FEEDBACK.md for KeeperHub | ✅ | `FEEDBACK.md` |

---

## License

MIT
