# HYDRA — Architecture

**One-line:** A multi-headed agent swarm where killing one agent spawns two replacements that inherit its memory plus a learned defense against whatever killed it. Every attack makes the network stronger.

---

## System diagram

```
                     ┌─────────────────────────────────┐
                     │   Next.js Dashboard (viewer)    │
                     │  D3 graph · scars · P&L · kill  │
                     └──────────────┬──────────────────┘
                                    │ SSE
                                    │ (state stream)
┌───────────────────────────────────┼────────────────────────────────┐
│                                   │                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Head 1     │  │   Head 2     │  │   Head 3     │    ...      │
│  │  (Node proc) │  │              │  │              │             │
│  │              │  │              │  │              │             │
│  │  strategy:   │  │  strategy:   │  │  strategy:   │             │
│  │  Aave-dep    │  │  UniV4-LP    │  │  payroll     │             │
│  │              │  │              │  │              │             │
│  │  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐  │             │
│  │  │ AXL:   │  │  │  │ AXL:   │  │  │  │ AXL:   │  │             │
│  │  │ :9002  │◄─┼──┼─►│ :9003  │◄─┼──┼─►│ :9004  │  │             │
│  │  └────────┘  │  │  └────────┘  │  │  └────────┘  │             │
│  │              │  │              │  │              │             │
│  │  ed25519 id  │  │  ed25519 id  │  │  ed25519 id  │             │
│  │  wallet      │  │  wallet      │  │  wallet      │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         │                 │                 │                      │
│         │ every 3s: heartbeat P2P (AXL)     │                      │
│         │ every 10s: state snapshot to 0G    │                      │
│         │ every action: append to 0G log     │                      │
│         │                 │                 │                      │
└─────────┼─────────────────┼─────────────────┼──────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
    ┌─────────────────────────────────────────────────┐
    │          0G Storage (persistence layer)         │
    │  KV: head-{id}/state     (current JSON)         │
    │  Log: head-{id}/history  (append-only events)   │
    │  KV: scars/global        (defense registry)     │
    └─────────────────────────────────────────────────┘
          │
          ▼
    ┌─────────────────────────────────────────────────┐
    │         0G Compute (new-head inference)         │
    │  spawned children run "should I act?" here      │
    │  verifiable, matches swarm track                │
    └─────────────────────────────────────────────────┘

          ┌─────────────────────────────────────────┐
          │       KeeperHub (execution layer)       │
          │  all on-chain actions go through this   │
          │  features used: tx sim, retry, private  │
          │  routing, audit trail, emergency exec,  │
          │  scheduled triggers                     │
          └────────────────┬────────────────────────┘
                           │
                           ▼
          ┌─────────────────────────────────────────┐
          │  0G Chain (EVM-compatible)              │
          │  contracts:                             │
          │  - HydraRegistry   (head lifecycle)     │
          │  - HydraTreasury   (pooled funds)       │
          │  - HydraExecutor   (whitelist router)   │
          └─────────────────────────────────────────┘
```

---

## Component breakdown

### 1. Head (the unit of life and death)
One Node.js process. One AXL node. One wallet. One DeFi role.

**Lifecycle:**
1. Boot → generate ed25519 identity → register with AXL mesh → read own state from 0G (if restarted) or init new state
2. Every 3s: broadcast heartbeat via AXL (signed ping containing current generation, role, peer list)
3. Every 10s: snapshot state to 0G KV
4. On action: append event to 0G Log
5. Listen for consensus events on AXL (death confirmations, resurrection coordinates, scar updates)
6. On death: process exits. Neighbors detect.

**Strategy module:** each head has ONE of:
- `AaveDeposit` — maintains a fixed deposit, earns yield
- `UniswapV4LP` — maintains LP in a single pool
- `Payroll` — executes a recurring scheduled payment

All strategies call `keeperhub.execute(txRequest)` for on-chain actions.

### 2. AXL mesh (the nervous system)
Each head runs its own AXL node (separate process, separate port in dev, separate container in prod). This satisfies the "MUST demonstrate communication across SEPARATE AXL nodes" qualification.

**Protocols over AXL:**
- `heartbeat` — every 3s, broadcast `{headId, generation, ts, sig}` to all peers via POST /send
- `suspicion` — if no heartbeat from peer X for 15s, broadcast `{type: "suspect", target: X}`
- `confirm_death` — if I receive 2+ suspicions for X (plus my own), broadcast `{type: "confirmed", target: X, cause}`
- `resurrection_claim` — lowest-id live head broadcasts `{type: "resurrect", target: X, leader: me}`
- `spawn_announce` — new head broadcasts `{type: "born", parent: X, scar: rule}` on boot
- `scar_learned` — broadcast new defense rule to all peers for immediate uptake

### 3. Consensus (the death ritual)
Simple, not-quite-Byzantine but fine for demo:

- **Suspected**: I haven't heard from X for > 15s
- **Confirmed dead**: ≥ (N/2)+1 heads (including me) have broadcast "suspect" for X within a 10s window
- **Leader election for resurrection**: lowest peer-id among confirmed-living heads
- **Idempotency**: resurrection keyed by `(dead_head_id, round_num)` to prevent double-spawn

### 4. Memory on 0G Storage
Three namespaces:

**KV Store** (fast, overwritable):
- `head-{id}/state` — latest JSON blob `{balance, position, lastDecision, scars}`
- `scars/global` — current array of learned defense rules
- `generation` — monotonically increasing swarm generation number

**Log Store** (append-only, auditable):
- `head-{id}/events` — one entry per decision, heartbeat anomaly, or tx

**Memory inheritance on birth:** a new head's boot reads its parent's last-known `state` KV (the "genetic memory"), plus `scars/global` (the collective learning). Children don't replay the parent's full log — that's forensic material for humans.

### 5. 0G Compute for children
When a child spawns, its first N inference calls route to 0G Compute instead of local execution. This marks children as "born in the decentralized compute layer." Demonstrates:
- The "Autonomous Agents, Swarms & iNFT" track's swarm requirement ("clear explanation of agent communication/coordination")
- Makes children's decisions verifiable

Fallback: if 0G Compute is flaky at demo time, cache a single call and retry later. Don't block the demo on it.

### 6. KeeperHub as the execution layer
Every on-chain action a head takes is wrapped in a KeeperHub call:

```ts
// Illustrative
await keeperhub.submit({
  target: "0xHydraExecutor",
  data: encodeAaveDeposit(amount),
  options: {
    simulate: true,       // tx simulation
    retry: 3,             // retry logic
    private: true,        // private routing (no MEV)
    auditTag: `head-${headId}-gen-${gen}`, // audit trail
  }
});
```

**Emergency redistribution** (the killer KeeperHub moment):
When a head is confirmed dead, the resurrection leader issues a KeeperHub "emergency" scheduled operation: "atomically withdraw the dead head's Aave position, split into two transfers to the child wallets, all in one simulated-then-executed bundle." This is the exact pattern KeeperHub exists for.

### 7. Scars (the learning mechanism)
A scar is a JSON rule: `{trigger, check, mitigation}`.

Example: `{trigger: "key_revoked", check: "every 60s verify signer is whitelisted", mitigation: "rotate to backup key"}`.

For v1, we don't ask an LLM to generate scars. We have a lookup table:

| Death cause | Scar rule |
|---|---|
| `key_revoked` | rotate-keys-every-60s + use-backup-signer |
| `process_killed` | checkpoint-state-every-heartbeat |
| `api_timeout` | fallback-rpc-on-2-failures |
| `wallet_drained` | transaction-value-cap + multi-sig-above-threshold |

Scars are stored in `scars/global` on 0G. All new heads inherit all scars. Scars are append-only — we never forget.

### 8. Dashboard (the judge's window)
Next.js + React + D3 + SSE. Single page:

- **Top**: generation counter, head count, scar count, cumulative P&L, "kills survived" counter
- **Center**: D3 force-directed graph — nodes are heads (colored by status: green=healthy, yellow=suspected, red=dead, blue=resurrecting, purple=newborn), edges are live AXL connections with heartbeat pulses
- **Right**: live event log (heartbeat, suspect, confirm, spawn, scar)
- **Bottom**: horizontal scar timeline — cards showing each learned defense with timestamp and cause
- **Floating**: demo controls — "Kill Head 2 (revoke key)", "Kill Head 2 (drain wallet)", "Double kill", reset button

---

## Data contracts (shared/types.ts)

```ts
export type HeadId = string; // ed25519 pubkey hex

export type HeadStatus = "booting" | "healthy" | "suspected" | "dead" | "resurrecting" | "newborn";

export type StrategyKind = "aave_deposit" | "univ4_lp" | "payroll";

export interface HeadState {
  id: HeadId;
  generation: number;
  parent: HeadId | null;
  status: HeadStatus;
  strategy: StrategyKind;
  wallet: `0x${string}`;
  balance: string; // wei
  position: { token: string; amount: string; venue: string } | null;
  lastHeartbeatAt: number;
  inheritedScars: string[]; // scar ids
  bornAt: number;
  deathCause: DeathCause | null;
}

export type DeathCause = "key_revoked" | "process_killed" | "api_timeout" | "wallet_drained";

export interface Scar {
  id: string;
  cause: DeathCause;
  rule: { trigger: string; check: string; mitigation: string };
  learnedAt: number;
  learnedFrom: HeadId;
}

export type AXLMessage =
  | { type: "heartbeat"; from: HeadId; gen: number; ts: number; sig: string }
  | { type: "suspect"; from: HeadId; target: HeadId; ts: number }
  | { type: "confirmed"; from: HeadId; target: HeadId; cause: DeathCause; ts: number }
  | { type: "resurrect"; from: HeadId; leader: HeadId; target: HeadId }
  | { type: "born"; from: HeadId; parent: HeadId; scar: Scar | null }
  | { type: "scar"; from: HeadId; scar: Scar };
```

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 + React 19 + TypeScript | User knows Next.js; ecosystem is fast |
| UI kit | TailwindCSS + shadcn/ui | Fast polish |
| Visualization | D3-force + Framer Motion | Force graph is the demo centerpiece |
| Realtime | Server-Sent Events | One-way state stream from agents to UI, simpler than websockets |
| Agent runtime | Node.js 22 + tsx | Single-language stack |
| P2P transport | Gensyn AXL (binary) | Sponsor requirement |
| Keys | ed25519 via `@noble/curves` | AXL identity |
| Wallets | viem | Modern TypeScript Ethereum client |
| Smart contracts | Solidity + Hardhat | Familiar + good 0G Chain support |
| Chain | 0G Chain testnet | Sponsor requirement |
| Storage | 0G Storage SDK | Sponsor requirement |
| Compute | 0G Compute SDK | Sponsor requirement |
| Execution | KeeperHub API + MCP | Sponsor requirement |
| Process isolation | Docker Compose | Each head + its AXL node = one service |
| Orchestration | Shell scripts | 12 days; no k8s |
| LLM (optional) | Claude Sonnet 4.6 via Anthropic SDK | For generated scar descriptions in demo captions |

---

## Folder layout

```
hydra/
├── README.md
├── FEEDBACK.md                # KeeperHub + Uniswap bounty
├── ARCHITECTURE.md            # → this file, copied in
├── docker-compose.yml         # 3 head services + axl nodes + web
├── .env.example
├── package.json               # monorepo workspaces root
│
├── shared/
│   ├── types.ts               # all cross-cutting types
│   └── constants.ts           # heartbeat intervals, timeouts
│
├── agents/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── head.ts            # process entrypoint
│       ├── identity.ts        # ed25519 key gen/load
│       ├── heartbeat.ts       # emit + receive pings
│       ├── consensus.ts       # suspect → confirm → leader elect
│       ├── resurrection.ts    # spawn child processes
│       ├── scars.ts           # defense rule registry
│       ├── memory/
│       │   ├── og-kv.ts       # 0G Storage KV client
│       │   ├── og-log.ts      # 0G Storage Log client
│       │   └── og-compute.ts  # 0G Compute inference
│       ├── execution/
│       │   ├── keeperhub.ts   # wraps KeeperHub MCP/API
│       │   └── strategies/
│       │       ├── aave.ts
│       │       ├── uniswap.ts
│       │       └── payroll.ts
│       └── axl/
│           ├── client.ts      # localhost:900x HTTP client
│           └── mesh.ts        # peer discovery + broadcast
│   └── scripts/
│       ├── bootstrap.ts       # spawn initial 3 heads
│       └── kill.ts            # demo kill CLI
│
├── web/
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx           # main dashboard
│       ├── api/
│       │   ├── heads/route.ts
│       │   └── events/route.ts  # SSE endpoint
│       └── components/
│           ├── HydraGraph.tsx   # D3 force graph
│           ├── HeadCard.tsx
│           ├── ScarTimeline.tsx
│           ├── KillControls.tsx
│           ├── EventLog.tsx
│           └── HeaderStats.tsx
│   └── lib/
│       ├── events.ts
│       └── og-reader.ts       # read 0G Storage for history view
│
├── contracts/
│   ├── hardhat.config.ts
│   ├── package.json
│   ├── contracts/
│   │   ├── HydraRegistry.sol
│   │   ├── HydraTreasury.sol
│   │   └── HydraExecutor.sol
│   ├── script/
│   │   └── Deploy.ts
│   └── test/
│       └── HydraTreasury.t.ts
│
└── demo/
    ├── storyboard.md           # shot-by-shot recording plan
    ├── kill-sequence.sh        # scripted demo kills
    └── README.md               # how to reproduce demo
```

---

## Deployment (for the demo)

Local (demo-ready):
- `docker compose up` → 3 heads + 3 AXL nodes + 1 web service, all networked
- Web available on `localhost:3000`
- Kill a head: `./demo/kill-sequence.sh key_revoked head-2`

Each "head" container bundles:
- The AXL binary running on that container's port
- The head's Node.js process
- Its own ed25519 key (volume-mounted)
- Its own env (`.env.head-1`, etc)

For judges: single README command `make demo` that builds + starts + opens browser.
