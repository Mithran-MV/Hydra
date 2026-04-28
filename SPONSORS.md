# Sponsor integration depth

> **For sponsor reviewers.** Every method, every file, every decision — so you don't have to dig.

HYDRA's three opt-ins (KeeperHub · Gensyn AXL · 0G) are load-bearing. Each section below names the SDK methods called, the files that call them, and what would break if the integration were removed.

The 3-sponsor cap on Open Agents is binding — see "Why three" in `README.md`.

---

## 1. Gensyn AXL · `agents/src/axl/`

**Prize criterion:** *"Cross-node communication (separate AXL nodes), NOT in-process."*

### How HYDRA satisfies it

Three Go binaries (`axl/bin/axl-node`), one per head, distinct ed25519 peer-ids, listening on TLS:

- `h1` → tls://127.0.0.1:9001, api 9002, peer `200:1d17:…`
- `h2` → tls://127.0.0.1:9011, api 9012, peer `203:7d33:…`
- `h3` → tls://127.0.0.1:9021, api 9022, peer `203:1069:…`

Mesh interconnects h2 → h1 and h3 → h1; ironwood gossip relays the rest. Confirmed in our logs:

```
[node] Connected outbound: 203:7d33:8188:f86e:867b:2e42:16f4:2e49@127.0.0.1:9001 …
[node] Connected outbound: 203:1069:c1b4:70fa:a773:a955:fb72:4d50@127.0.0.1:9001 …
```

### Files that talk to AXL

| File | Methods used |
|---|---|
| `agents/src/axl/client.ts` | `getMyPeerId`, `send`, `recvStream`, `getTopology` (`GET /topology`, `POST /send`, `GET /recv`) |
| `agents/src/axl/mesh.ts` | tracks peer presence, `markSeen`, `registerDynamic`, `registerKnownPeersFromKeysDir` |
| `agents/src/heartbeat.ts` | broadcasts signed `heartbeat` over AXL every 3 s |
| `agents/src/consensus.ts` | broadcasts `suspect` / `confirmed` quorum messages |
| `agents/src/resurrection.ts` | broadcasts `born` after spawning children |
| `agents/src/scars.ts` | broadcasts `scar` so all heads can register the new defense |

### Custom protocol over AXL

```
heartbeat  → signed ping every 3 s
suspect    → "this peer missed N heartbeats"
confirmed  → ⌈n/2⌉+1 quorum of suspecters → leader broadcasts cause
panic      → sub-second freeze signal (any head can trip)
born       → "a new peer just joined the mesh"
scar       → "the swarm has learned a new defense rule"
```

### What breaks without AXL

The death detection pipeline collapses to a polled center (one process watching the others). Once a single watcher exists, the system is no longer anti-fragile — kill the watcher and nothing notices. This is the prize criterion in inverse: *AXL's value to HYDRA is that the swarm cannot be centralized.*

---

## 2. 0G · Storage + Compute + Chain

**Prize criterion:** *"Best Autonomous Agents, Swarms & iNFT Innovations"* (Track 2). HYDRA also fits Track 1 (*"Best Agent Framework, Tooling & Core Extensions"*) since the swarm orchestrator is reusable infrastructure, not just one product. Per ETHGlobal's submission rules, picking 0G consumes one of the 3 partner-prize slots regardless of how many of 0G's tracks the project applies to.

### Three integrations, three outcomes

| 0G surface | What HYDRA stores there | File |
|---|---|---|
| Storage (KV) | per-head `HeadState` snapshots (current JSON, overwritten every 10 s) | `agents/src/memory/og-kv.ts` |
| Storage (Log) | append-only event stream (heartbeats, deaths, scars, mints) | `agents/src/memory/og-log.ts` |
| Storage (Blob) | bulk dataset uploads via `Indexer` + `Batcher` | `agents/src/memory/og-storage.ts` |
| Compute | TEE-attested inference per resurrection (`createZGComputeNetworkBroker`) | `agents/src/memory/og-compute.ts` |
| Chain | 4 contracts on chain 16602 (Galileo testnet) | `agents/src/execution/chain.ts` |

### Compute — the TEE-attested inference

Children call `0G Compute` once on boot to ask *"should I act now or wait?"*. The response is verified via:

```ts
const verified = await broker.inference.processResponse(providerAddress, chatID);
```

`processResponse` runs the TeeML / TeeTLS attestation on the response — if the provider lied, `verified === false`. The dashboard's `TEEBadge` reads this from the latest `compute.inference` event.

> **Operational note:** the broker requires a 3 OG minimum to bootstrap a per-wallet ledger, and Galileo testnet's faucet caps at 0.1 OG / day per address. The SDK is fully wired (broker init + `listService` + `getServiceMetadata` succeed) — only the sub-account creation is blocked by faucet ergonomics. See the typed error in `agents/src/memory/og-compute.ts:65–75`.

### Chain — the four contracts

```solidity
HydraRegistry             0xc9dba9030dc15a2aa5d020cb4009ebfffc508ba3
HydraTreasury             0xda181fdfd86965e83cddb9193734ed3e7c879171
HydraExecutor             0x1d5059499088ae2dcf77652562dd08f468a46a39
HydraScars (iNFT, v2)     0x838083ff1334ccc68400d1576f59282d32320dbe
HydraScars (iNFT, v1)     0x03210f64072ceb1040dbdd37b32e7b0caeeae320  // historical
```

`HydraScars.mintScar(...)` mints an ERC-721 token whose `tokenURI` returns a `data:application/json;base64,…` URI containing cause + mitigation rule + outcome (in an `attributes` array per the OpenSea metadata convention). The "intelligence" of the swarm is therefore portable — any future agent can read the metadata and inherit the defense, and any chain explorer that supports ERC-721 + ERC-165 will render the NFT card with the rule visible in the metadata pane.

#### Why ERC-7857 is deferred (v2 build step)

ERC-7857 is 0G's iNFT spec for verifiable intelligence NFTs. Full conformance requires three pieces beyond ERC-721: TEE attestation hooks bound to each token (so the inference that produced the token's "intelligence" is provably honest); encrypted intelligence storage with re-encryption rights for new owners on transfer; and a royalty split between the original intelligence author and downstream re-mixers. Each of those is a multi-day spec read + implementation pass on its own, plus a re-deploy and migration of existing scars. With ~5 days left in the hackathon and the rest of the swarm + cadence still landing, the right call was to ship a chain-explorer-renderable ERC-721 collection that satisfies the embedded-memory criterion via on-chain `ruleOf` storage, and pin ERC-7857 as the obvious next-build target. The MintedScar event signature, the outcomeOf mapping, and the data URI shape were all chosen with that upgrade in mind so the migration is additive rather than rewriting.

Production scars on v2: see the README's "Minted iNFTs" table for current tokens + tx hashes.

### What breaks without 0G

Death becomes amnesia. Without Storage, children can't read the parent's last state, so resurrection is a no-op (a freshly-spawned head with no inheritance is just a restart). Without Chain, scars don't mint as iNFTs and the "intelligence" claim becomes hand-waving. Without Compute, children's "should I act?" decision is local + unverifiable.

---

## 3. KeeperHub · `agents/src/execution/keeperhub.ts`

**Prize criteria:** *"Best Use of KeeperHub" + "Builder Feedback Bounty"*.

### Three workflows, three trigger types

| # | Name | Trigger | Purpose |
|---|---|---|---|
| 1 | HYDRA Death Webhook | Webhook | Audit trail for confirmed deaths (workflow `lcyuk85gh46defy5xaq8b`) |
| 2 | HYDRA Heartbeat Stale | Webhook | Inter-quorum delay observability — fired when a watchdog suspects a peer |
| 3 | HYDRA Scar Learned | Webhook | External audit on every newly-learned defense rule |
| 4 | HYDRA Treasury Watch | Schedule + Protocol Action | Native KH protocol action (Get ETH Balance) on a 5-minute cron, breach detection in Run Code |

Workflow #4 demonstrates KH *depth* (native protocol action, not just Run Code) — see `demo/keeperhub-setup.md` for the UI walkthrough.

### Code paths

| Function | What it does | When |
|---|---|---|
| `notifyRedistribute(payload, headId)` | POSTs the death payload to workflow 1's webhook URL | After resurrection completes |
| `notifyHeartbeatStale(payload, headId)` | POSTs to workflow 2's webhook URL | When `consensus.handleSuspect` first marks a peer suspect |
| `notifyScarLearned(payload, headId)` | POSTs to workflow 3's webhook URL | Inside `onLeadershipResurrection` after `persistGlobalScar` |

All three POSTs include a Bearer-style API key (`KEEPERHUB_KEY`) and degrade gracefully on 401 (see KEEPERHUB_FEEDBACK.md, finding F-1 — webhook auth gap is documented as builder feedback).

### Builder feedback bounty (`KEEPERHUB_FEEDBACK.md`)

Four reproducible findings logged during integration:

- **F-1** Public webhook URL rejects the org API key with 401 *"Invalid API key format"* — workaround: invoke via `mcp__keeperhub__execute_workflow` from an MCP-authorized client.
- **F-2** MCP write scope is narrower than read — `list_workflows` works, `create_workflow` returns 401.
- **F-3** 0G Galileo (chain 16602) is not in KH's supported chain list — agent-side execution via viem direct, KH is the audit overlay.
- **F-4** Template editor flags valid Run Code with `Declaration or statement expected (1128)` until a body is filled in.

### What breaks without KeeperHub

The redistribution lacks an external audit trail. The agent could still emit events to its own log, but a reviewer has no way to verify "this swarm reacted to these deaths" without trusting the agent's own self-reporting. KeeperHub provides the third-party run history — it's the *audit* layer, not the execution layer (chain handles execution). Removing it leaves the system functioning but unverifiable.

---

## Why these three (and only these three)

The Open Agents prize structure caps every project at three sponsor opt-ins. HYDRA's choice maps to three irreducible architectural needs:

```
KeeperHub  =  "I attest this swarm reacted"     (audit / orchestration)
AXL        =  "I attest this swarm is decentralized"  (transport / consensus)
0G         =  "I attest this swarm remembers + learns"  (memory / chain)
```

Drop any one and the architecture collapses to a centralized executor with extra steps. Add a fourth (Uniswap, ENS, x402) and one of the three has to go — every option degrades the core claim more than the addition adds. The cap is therefore a discipline, not a limit.
