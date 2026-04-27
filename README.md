# HYDRA

**Anti-fragile agent swarm. Kill a head, two grow back. Every attack makes it stronger.**

Submitted to ETH Global Open Agents Hackathon (April 24 – May 6, 2026).

> *"You can't kill what evolves from pain."*

---

## The pitch

Every agent system today is fragile. One compromised key, one crashed process, one revoked API — and the positions it manages collapse. HYDRA flips that: each "head" is an autonomous agent with its own ed25519 identity, its own EVM wallet, and its own strategy. When one dies, the surviving heads reach consensus on the cause, the leader spawns two children that inherit the dead head's memory + a fresh defense rule (a "scar") against whatever killed it, and KeeperHub orchestrates the audit trail. Every attack makes the swarm bigger and smarter.

**Live demo (record):** [paste YouTube unlisted link before submission]
**Dashboard:** `npm run dev:web` then http://localhost:3000/dashboard
**Repository:** https://github.com/Mithran-MV/Hydra

---

## Contract addresses (0G Galileo testnet · chain 16602)

| Contract | Address |
|---|---|
| HydraRegistry  | [`0xc9dba9030dc15a2aa5d020cb4009ebfffc508ba3`](https://chainscan-galileo.0g.ai/address/0xc9dba9030dc15a2aa5d020cb4009ebfffc508ba3) |
| HydraTreasury  | [`0xda181fdfd86965e83cddb9193734ed3e7c879171`](https://chainscan-galileo.0g.ai/address/0xda181fdfd86965e83cddb9193734ed3e7c879171) |
| HydraExecutor  | [`0x1d5059499088ae2dcf77652562dd08f468a46a39`](https://chainscan-galileo.0g.ai/address/0x1d5059499088ae2dcf77652562dd08f468a46a39) |
| HydraScars (iNFT) | [`0x03210f64072ceb1040dbdd37b32e7b0caeeae320`](https://chainscan-galileo.0g.ai/address/0x03210f64072ceb1040dbdd37b32e7b0caeeae320) |

Deployer: `0x7CDbb447D2a604bceF944e16ab6B9515601c6dB7`

---

## How it works

1. **AXL mesh** — each head runs its own Gensyn AXL Go node (separate process, distinct ed25519 peer-id, listens on its own TLS port). Heartbeats are signed and routed peer-to-peer every 3 seconds — no central broker.
2. **Consensus** — when a peer misses 5 heartbeats (15s), surviving heads broadcast `suspect` messages. When ⌈n/2⌉+1 heads agree, the lowest-peer-id leader broadcasts `confirmed` with the inferred death cause.
3. **Memory on 0G Storage** — every head persists `HeadState` snapshots and event logs to 0G Storage. Children inherit this on boot. Scars (defense rules) are persisted to a global stream all heads read on startup.
4. **Resurrection** — leader generates two fresh ed25519 keypairs, writes AXL configs, spawns two AXL Go sidecars, then spawns two Node head processes with `PARENT_ID` env var. Children boot, read parent's last state from 0G, broadcast `born`, join the mesh.
5. **TEE-verified inference** — children call `0G Compute` once on boot via `@0glabs/0g-serving-broker`. The response is verified via `processResponse` (TeeML / TeeTLS attestation) so the swarm's "should I act?" decision is provably honest compute.
6. **iNFT scar minting** — every learned defense rule mints an ERC-721-like NFT on `HydraScars` (chain 16602). Each token's metadata embeds the cause + mitigation rule on chain — auditable by judges.
7. **KeeperHub audit trail** — leader fires a webhook to a KeeperHub workflow on every confirmed death. The workflow logs the death payload + audit record in run history (the prize criterion's "audit trail").
8. **Whitelisted execution** — funds live in `HydraTreasury`, never in head EOAs. `HydraExecutor` permits only `(target, selector)` pairs explicitly whitelisted by the owner. A compromised head's key cannot drain the treasury — it can only call functions that route value back to the treasury.

---

## Sponsors

| Sponsor | Role | Code |
|---|---|---|
| **Gensyn AXL** | P2P signed messaging across 3 separate Go nodes — heartbeat, suspect, confirmed, scar, born, panic | `agents/src/axl/`, `configs/h*.json` |
| **0G** | Storage (head state + global scars), Compute (TEE inference per resurrection), Chain (4 deployed contracts) | `agents/src/memory/`, `contracts/contracts/`, `agents/src/execution/chain.ts` |
| **KeeperHub** | Workflow orchestration (webhook trigger on confirmed death) + audit run history | `agents/src/execution/keeperhub.ts`, KH workflow `lcyuk85gh46defy5xaq8b` |

Each sponsor is load-bearing: without AXL the anti-fragility is centralized; without 0G death means amnesia; without KeeperHub the redistribution lacks an auditable third-party trail.

---

## Setup (local)

Prerequisites: Node 22+, Go 1.21+, an OG-funded wallet on 0G Galileo testnet.

```bash
git clone https://github.com/Mithran-MV/Hydra.git
cd Hydra
npm install

# 0G testnet wallet — paste your private key (never commit)
cp .env.example .env
# edit .env: OG_CHAIN_PK=0x...

# build the AXL Go binary
git clone https://github.com/gensyn-ai/axl /tmp/axl-src && (cd /tmp/axl-src && make build) && cp /tmp/axl-src/node axl/bin/axl-node

# generate 5 ed25519 keys (3 originals + 2 children reserves)
mkdir -p keys
for i in 1 2 3; do /opt/homebrew/opt/openssl/bin/openssl genpkey -algorithm ed25519 -out keys/h$i.pem; done

# end-to-end demo
./demo/full-demo.sh --cause key_revoked
open http://localhost:3000/dashboard
```

Kill a head manually:

```bash
./demo/kill.sh 2 --cause api_timeout
```

Reset (wipe runtime state):

```bash
./demo/reset.sh --hard
```

## Setup (VPS — dashboard only)

```bash
git clone https://github.com/Mithran-MV/Hydra.git
cd Hydra
docker compose up -d
# rsync ./logs from your dev machine periodically, or run agents directly on VPS
open http://<vps-ip>:3000/dashboard
```

---

## Repo structure

```
hydra/
├── agents/             head process, heartbeat, consensus, resurrection,
│                       0G integration, KeeperHub webhook caller, strategies
├── web/                Next.js dashboard with SwarmGraph (D3 force-directed),
│                       TEEBadge, KeeperHubRunCard, scar timeline
├── contracts/          HydraRegistry, HydraTreasury, HydraExecutor,
│                       HydraScars (Solidity 0.8.26)
├── shared/             AXLMessage union, HeadState, Scar, SwarmSnapshot types
├── configs/            AXL Go-node configs (one per head, distinct ports)
├── demo/               full-demo.sh, kill.sh, reset.sh
├── FEEDBACK.md         KeeperHub Builder Feedback bounty submission
└── README.md           you are here
```

---

## Team

**HYDRA**

- Mithran M.V. — GitHub [@Mithran-MV](https://github.com/Mithran-MV)
- *teammate name* — *github handle*
- *teammate name* — *github handle*

---

## Qualification checklist

| Requirement | Status | Where |
|---|---|---|
| KeeperHub MCP/workflow integration | ✅ | `agents/src/execution/keeperhub.ts`, KH workflow ID `lcyuk85gh46defy5xaq8b` |
| KeeperHub Builder Feedback (bounty) | ✅ | `FEEDBACK.md` |
| AXL cross-node communication (separate nodes, not in-process) | ✅ | 3 Go binaries on ports 9001/9011/9021, see `configs/` |
| 0G Storage (KV + blob upload) | ✅ | `agents/src/memory/og-kv.ts`, `og-storage.ts` |
| 0G Compute (TEE-verified inference) | ✅ | `agents/src/memory/og-compute.ts` (children call on boot) |
| 0G Chain (contracts deployed) | ✅ | 4 contracts on 16602 — see addresses table above |
| iNFT (swarm-learned defenses on chain) | ✅ | `HydraScars` mints on every new scar |
| Public GitHub + README | ✅ | https://github.com/Mithran-MV/Hydra |
| Demo video < 3 min | 🟡 | recorded Day 11 — link goes here |
| Agent coordination explained | ✅ | "How it works" section above |
| Built during hackathon (Apr 24 – May 6, 2026) | ✅ | git history shows incremental commits per day |

---

## License

MIT
