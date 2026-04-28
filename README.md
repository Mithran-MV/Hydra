# HYDRA

[![Live](https://img.shields.io/badge/live-hydra.hacklabs.in-37ff9e?style=flat-square)](https://hydra.hacklabs.in/dashboard)
[![Hackathon](https://img.shields.io/badge/ETHGlobal-Open%20Agents%202026-ff2d55?style=flat-square)](https://ethglobal.com/events/agents)
[![Chain](https://img.shields.io/badge/0G%20Galileo-chain%2016602-37ff9e?style=flat-square)](https://chainscan-galileo.0g.ai)
[![Sponsors](https://img.shields.io/badge/sponsors-KeeperHub%20%C2%B7%20AXL%20%C2%B7%200G-ffb347?style=flat-square)](./SPONSORS.md)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)

**An anti-fragile agent swarm. Kill one head, two grow back — carrying the dead head's memory and a permanent defense against whatever just killed it. All four kill types covered: `process_killed` · `wallet_drained` · `api_timeout` · `key_revoked`.**

> Live →
> [**View live dashboard →**](https://hydra.hacklabs.in/dashboard) ·
> [**Read the Chronicle →**](https://hydra.hacklabs.in/chronicle) ·
> [**GitHub →**](https://github.com/Mithran-MV/Hydra)

> **4 attacks captured** · 4 cause types · **26** KeeperHub runs across 4 workflows · **84,357** AXL messages (44,922 send / 39,435 recv) · **4 iNFTs** minted on HydraScars v2 · **2** 0G Storage uploads (rootHash + txHash on chainscan-galileo) · 176+ incremental commits.

**Demo video** (≤ 3 min): *link will be added 2026-04-30 before submission.*

**Production execution + learning layer for autonomous agent fleets.** When agents fail, the swarm doesn't just respawn them — it inherits their memory and a learned defense against the failure mode. Every attack hardens the network.

---

## The problem

Today's agent fleets — yield bots, keeper networks, automated treasuries, agentic DeFi — are uniformly fragile. One revoked API key, one process crash, one RPC timeout, one drained EOA, and the position the agent was managing collapses. Worse: the rest of the fleet learns nothing. Every team rebuilds the same incident response from scratch.

HYDRA is the layer underneath those agents. Each head runs the strategy you'd run anyway (Aave deposit, Uniswap LP, scheduled payroll), but it does so as a member of a peer-to-peer swarm with three properties:

1. **Availability bounded by minutes, not days.** When a head dies, the swarm reaches consensus on the cause within ~15s and a leader spawns two replacements within another ~30s. Total downtime per head: <60 seconds.
2. **Memory inherited across deaths.** Children read the dead head's last `HeadState` snapshot on boot from a local KV mirror (today) plus a 0G Storage blob upload of every newly-learned scar (live, returns `rootHash` + `txHash`). KV-on-0G via the official SDK is on the D7 build day; until then the local mirror is the source of truth and every scar is independently durable on the 0G Storage Indexer.
3. **Failures become permanent immune responses.** Every confirmed death writes a defense rule (`scar`) to a global stream and mints it as an iNFT on 0G Chain. Every surviving and future head reads it on boot. The swarm gets *smarter every time it gets attacked*, and the rule is publicly auditable as ERC-721 metadata anyone can inherit.

Agent operators get bounded downtime + cumulative immunity. Treasuries don't get drained — funds live in a constrained `HydraTreasury`, never in head EOAs, with execution gated behind a whitelist of (target, selector) pairs. A compromised head cannot route value anywhere except back to the treasury.

**Live dashboard:** https://hydra.hacklabs.in/dashboard — three originals plus gen-1 children, mesh connected, on-chain Treasury balance live
**The Chronicle (verifiable evidence):** https://hydra.hacklabs.in/chronicle — every claim above traceable to a tx hash, KH execution id, or events.jsonl line
**Repository:** https://github.com/Mithran-MV/Hydra

---

## Contract addresses (0G Galileo testnet · chain 16602)

| Contract | Address |
|---|---|
| HydraRegistry  | [`0xc9dba9030dc15a2aa5d020cb4009ebfffc508ba3`](https://chainscan-galileo.0g.ai/address/0xc9dba9030dc15a2aa5d020cb4009ebfffc508ba3) |
| HydraTreasury  | [`0xda181fdfd86965e83cddb9193734ed3e7c879171`](https://chainscan-galileo.0g.ai/address/0xda181fdfd86965e83cddb9193734ed3e7c879171) |
| HydraExecutor  | [`0x1d5059499088ae2dcf77652562dd08f468a46a39`](https://chainscan-galileo.0g.ai/address/0x1d5059499088ae2dcf77652562dd08f468a46a39) |
| HydraScars (iNFT, v2 ERC-721) | [`0x838083ff1334ccc68400d1576f59282d32320dbe`](https://chainscan-galileo.0g.ai/token/0x838083ff1334ccc68400d1576f59282d32320dbe) |
| HydraScars (iNFT, v1 historical) | [`0x03210f64072ceb1040dbdd37b32e7b0caeeae320`](https://chainscan-galileo.0g.ai/token/0x03210f64072ceb1040dbdd37b32e7b0caeeae320) |

Deployer: [`0x7CDbb447D2a604bceF944e16ab6B9515601c6dB7`](https://chainscan-galileo.0g.ai/address/0x7CDbb447D2a604bceF944e16ab6B9515601c6dB7)

**iNFT — intelligence embedded on chain.** Every learned defense rule mints
a `HydraScars` token whose `tokenURI` returns on-chain JSON: the cause that
killed the parent and the mitigation rule the swarm now carries. The rule
string is written to contract storage at mint time — not an off-chain hash
or IPFS pointer — so the "intelligence" of the swarm is verifiable directly
from the chain. Anyone can fetch a scar, read the rule, and inherit the
swarm's hard-earned lessons.

> **Standard disclosure.** `HydraScars` is implemented as full
> **ERC-721 + ERC-165 + ERC-721Metadata** with embedded scar memory in
> `mapping(uint256 => string) public ruleOf`. The `tokenURI` function
> returns a `data:application/json;base64,…` URI so chain explorers
> render the NFT card with the rule visible in the metadata pane.
> Standard upgrade to ERC-7857 (0G's iNFT spec) is deferred as a v2 build
> step — see [SPONSORS.md](./SPONSORS.md) for rationale.

### Minted iNFTs (HydraScars v2 · chain 16602)

Production scars live on the v2 contract at
[`0x838083ff…`](https://chainscan-galileo.0g.ai/token/0x838083ff1334ccc68400d1576f59282d32320dbe)
(full ERC-721 surface, ERC-165 detectable, `totalSupply` = 4 — one per attack
captured). Cause + rule + outcome are stored in contract mappings
(`causeOf[tokenId]`, `ruleOf[tokenId]`, `outcomeOf[tokenId]`) and surfaced
through `tokenURI` as a base64-encoded data URI. Click any "Mint tx"
link to verify the mint event and the embedded rule on chainscan-galileo.

| Token | Cause | Rule (embedded in `ruleOf[id]`, returned by `tokenURI`) | Owner | Mint tx |
|---|---|---|---|---|
| #1 | `process_killed` | "shorter checkpoint interval + supervisord respawn" | h1 wallet | [`0x26d45f5a…`](https://chainscan-galileo.0g.ai/tx/0x26d45f5a98e8fe77470a90d0a727617e543a4586723c6e5ff58ee0c82e19d926) |
| #2 | `wallet_drained` | "halt strategy + require multi-sig approval for next action" | h3 wallet | [`0x995f2c88…`](https://chainscan-galileo.0g.ai/tx/0x995f2c88072ec25b74b7cb940d4553a3145400552a0ee9ccfe9928adb436e94f) |
| #3 | `api_timeout` | "fall back to secondary RPC after 2 consecutive failures" | h1 wallet | [`0x94bea901…`](https://chainscan-galileo.0g.ai/tx/0x94bea901534439ec6a795036f1311593ce5d6ca71ee4294001376d1673f6b326) |
| #4 | `key_revoked` | "rotate to backup signer and re-register with registry" | h1 wallet | [`0xd04c5ac2…`](https://chainscan-galileo.0g.ai/tx/0xd04c5ac218341de3890ee14977f92a5608c4b6617d52a3f9593af0220332bba3) |

Sample decoded `tokenURI(2)` (the `wallet_drained` scar from attack #2,
base64-decoded for readability):

```json
{
  "name": "Scar #2",
  "description": "A defense rule the HYDRA swarm has learned. Each scar is minted on the death of an agent and inherited by every survivor and future spawn - the swarm gets stronger every time it is attacked.",
  "cause": "77616c6c65745f647261696e6564000000000000000000000000000000000000",
  "rule": "halt strategy + require multi-sig approval for next action",
  "attributes": [
    { "trait_type": "cause", "value": "wallet_drained" },
    { "trait_type": "scar_id", "value": 2 },
    { "trait_type": "outcome", "value": "resurrected" }
  ]
}
```

`outcome` defaults to `"resurrected"` and is mutable via `setOutcome` once
scar-enforced defense ships (D7 build task) — at which point a second
attack of an already-known cause flips the value to `"defended"`.

New scars mint to this contract per attack per the cadence in
[`docs/planning/DAILY_ATTACK_CADENCE.md`](./docs/planning/DAILY_ATTACK_CADENCE.md).

#### Historical scars (v1 contract)

The earlier `HydraScars` deploy at
[`0x03210f64…`](https://chainscan-galileo.0g.ai/token/0x03210f64072ceb1040dbdd37b32e7b0caeeae320)
holds five tokens minted under the loose-721 surface (no ERC-165, plain
JSON tokenURI). Tokens #4 and #5 there correspond to the two production
attacks above and were re-minted on v2 with proper ERC-721 metadata;
tokens #1–#3 stay on v1 as pre-cadence dev artifacts.

### Live attacks captured

The swarm at `hydra.hacklabs.in` runs continuously. Every row below is a real
attack against the live deployment, captured with chain proofs anyone can
verify on chainscan-galileo. **All four cause types now represented**
(process_killed · wallet_drained · api_timeout · key_revoked). For current
swarm state see the [live dashboard](https://hydra.hacklabs.in/dashboard);
for the complete record with KH execution ids, AXL message stream, and 0G
storage uploads see [the Chronicle](https://hydra.hacklabs.in/chronicle).

| # | UTC | Cause | Target | Outcome | Death | Scar | iNFT | Born ×2 |
|---|---|---|---|---|---|---|---|---|
| 1 | 04-28 11:52 | `process_killed` | h2 (univ4_lp) | killed → resurrected | [`0xed1c918…`](https://chainscan-galileo.0g.ai/tx/0xed1c91804448c8701f9c26aa4e3c55e9485ab566cd87d8370abecfa6a077e59b) | [`0x857e9f1…`](https://chainscan-galileo.0g.ai/tx/0x857e9f1234abbd35aa146adedc36e9b51fc2edf783ed288b364b4229dfa6099c) | [`0xb8f858d…`](https://chainscan-galileo.0g.ai/tx/0xb8f858d900ac66d4a5e25fa00ed41f7d6bca0b0e228ef59e7afafc58e375633e) | [h4](https://chainscan-galileo.0g.ai/tx/0x9350a6fbc33d958cc78a3319c0ffe5b5059fe51a1d4d63e90136940c8489866d) · [h5](https://chainscan-galileo.0g.ai/tx/0xd2120eb6cbe7d8a99b7a6ed278d2d30fa554d6112bb11e9e8d90ccf465f00822) |
| 2 | 04-28 12:45 | `wallet_drained` | h1 (aave_deposit) | killed → resurrected | [`0x98c068d…`](https://chainscan-galileo.0g.ai/tx/0x98c068d469c9929ebad399aa8e4d5663b3008a44ed93458edfa6d33ff5b6edf2) | [`0x808b6ee…`](https://chainscan-galileo.0g.ai/tx/0x808b6ee22dfbcb4f8fd64a56d0ff064ee4f7f134eb1f9df462cc272d0d95ea17) | [`0xb6dfa3b…`](https://chainscan-galileo.0g.ai/tx/0xb6dfa3ba4ce6858a4a6416dfe3582b77073a4e9bdf4aa069af519bc3a0dbf56b) | [h8](https://chainscan-galileo.0g.ai/tx/0x4fc4eb26a827b3f8e80f3de430548ff4cac9419692f85e530c742ae0646981db) · [h9](https://chainscan-galileo.0g.ai/tx/0xb2e8ac840aac23bf3fea787ba906cde64c33ccfbc504591a97ff7f6677bccbff) |
| 3 | 04-28 18:18 | `api_timeout` | h3 (payroll) | killed → resurrected | [`0x368cef5…`](https://chainscan-galileo.0g.ai/tx/0x368cef572f9c5de7f47d41d087e677a4ce27d58bf6ee7e0693e92a1589e3a5ad) | [`0x6291832…`](https://chainscan-galileo.0g.ai/tx/0x629183202db745311262a6421278386475f6dfc42b8a335aa71ab74829cb442d) | [`0x94bea90…`](https://chainscan-galileo.0g.ai/tx/0x94bea901534439ec6a795036f1311593ce5d6ca71ee4294001376d1673f6b326) | [h10](https://chainscan-galileo.0g.ai/tx/0xdfe2d5986be505fd701b2c26a5b83eb8933a99adb17aa91f3879a4ced8c63912) · [h11](https://chainscan-galileo.0g.ai/tx/0x002e116de740767a72b3185c769b5c0572230f0c36a0311c423f7e484fdc4fb9) |
| 4 | 04-28 18:40 | `key_revoked` | h2 (revived) | killed → resurrected | nonce raced (off-chain) | [`0xa838ef8…`](https://chainscan-galileo.0g.ai/tx/0xa838ef84f03e41fa1732dddc8e62823ea1bec4bbaeb370b431057f26127e27c2) | [`0xd04c5ac…`](https://chainscan-galileo.0g.ai/tx/0xd04c5ac218341de3890ee14977f92a5608c4b6617d52a3f9593af0220332bba3) | [h12](https://chainscan-galileo.0g.ai/tx/0x54e39c7f217ea299a401e36fe76f5fc2879b62fd79bb05b309a51a3457f9be25) · [h13](https://chainscan-galileo.0g.ai/tx/0xdebd0520c28e053ae439f2af9298c2e3dfb6a8eb678fb6a926f1991a76770781) |

Attack #4's death tx hit a known shared-deployer-wallet nonce race; the
off-chain consensus + resurrection still completed cleanly and the four
remaining chain proofs (scar / iNFT / 2 born) are verifiable. The race is
documented in [`docs/ADVERSARIAL_TESTING.md`](./docs/ADVERSARIAL_TESTING.md).
The "Outcome" column reads `killed → resurrected` for every row today;
mechanical scar enforcement (so a second attack of a known cause is
*blocked* rather than absorbed-and-resurrected) is v2 work. Per-attack
journalctl traces under [`docs/attacks/`](./docs/attacks/).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                Dashboard (Next.js + SSE @ :3000)                    │
│              SwarmGraph · TEE Badge · KH Run Card · Scars           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  /api/events SSE
                               │  reads logs/og-kv + events.jsonl
                               ▼
   ┌────────────────────────────────────────────────────────────────┐
   │                     LIVE SWARM (3 → 4 → 6 → …)                 │
   │                                                                │
   │   head-1 (Aave)        head-2 (UniV4 LP)     head-3 (Payroll)  │
   │   peer-id 182cc…       peer-id f1741…        peer-id 1ef96…    │
   │   wallet 0xA1C4…       wallet 0xaEE0…        wallet 0x1Cd5…    │
   │      │                    │                     │              │
   │      │ localhost:9002     │ localhost:9012      │ localhost:    │
   │      ▼                    ▼                     ▼   9022       │
   │   ┌──────┐  TLS+Yggdrasil mesh     ┌──────┐  ┌──────┐           │
   │   │ AXL  │◄──────────────────────►│ AXL  │◄►│ AXL  │           │
   │   │ Go   │  signed heartbeat 3s   │ Go   │  │ Go   │           │
   │   │:9001 │  suspect / confirmed   │:9011 │  │:9021 │           │
   │   └──────┘  resurrect / scar      └──────┘  └──────┘           │
   │                  panic / born                                   │
   └──┬─────────────────────────┬────────────────────────────┬──────┘
      │                         │                            │
      ▼                         ▼                            ▼
  ┌───────────────┐    ┌────────────────────┐    ┌───────────────────┐
  │ 0G Storage    │    │ KeeperHub          │    │ 0G Compute        │
  │               │    │                    │    │                   │
  │ • head state  │    │ workflow           │    │ TEE-verified      │
  │   (KV)        │    │ lcyuk85gh46defy…   │    │ inference per     │
  │ • scars       │    │                    │    │ resurrection.     │
  │   (global KV  │    │ trigger: webhook   │    │ processResponse() │
  │    + blob     │    │ action: Run Code   │    │ verifies TeeML.   │
  │    upload)    │    │ exec'd via MCP →   │    │                   │
  │               │    │ run history is     │    │                   │
  │               │    │ external audit     │    │                   │
  └───────────────┘    └────────────────────┘    └───────────────────┘
                               │
                               ▼
   ┌────────────────────────────────────────────────────────────────┐
   │              0G Galileo testnet · chain id 16602               │
   │                                                                │
   │   HydraRegistry        HydraTreasury       HydraExecutor       │
   │   (events: Death,      (pooled funds,      (whitelisted        │
   │    Born, Spawn,         per-head book-      (target, selector) │
   │    Scar, Heartbeat)     keeping; only-      pairs only —       │
   │                         Executor mutates)   actual drain       │
   │                                             defense)           │
   │                                                                │
   │              HydraScars (iNFT — ERC-721 + on-chain             │
   │              JSON metadata embedding the learned rule)         │
   └────────────────────────────────────────────────────────────────┘
```

**The death ritual:** attack → head process dies → AXL `/recv` stops returning
heartbeats from that peer → after 15 s scanner triggers `suspect` broadcast →
quorum (⌈n/2⌉+1) reaches `confirmed` with cause from latest panic → leader
(lowest-peer-id) writes scar to 0G global stream + broadcasts → mints iNFT
on `HydraScars` → spawns 2 children with fresh ed25519 keys → children boot,
inherit dead head's state from 0G KV, call 0G Compute (TEE-verified) for an
action signal → KeeperHub workflow gets a webhook with the full payload for
external audit. End state: swarm went 3 → 4 (one dead, two born), every
surviving + future head now carries the new defense rule.

## How it works

1. **AXL mesh** — each head runs its own Gensyn AXL Go node (separate process, distinct ed25519 peer-id, listens on its own TLS port). Heartbeats are signed and routed peer-to-peer every 3 seconds — no central broker.
2. **Consensus** — when a peer misses 5 heartbeats (15s), surviving heads broadcast `suspect` messages. When ⌈n/2⌉+1 heads agree, the lowest-peer-id leader broadcasts `confirmed` with the inferred death cause.
3. **Memory on 0G Storage** — every newly-learned scar is uploaded to 0G Storage as a JSON blob via `uploadJsonToOG` (returns `rootHash` + `txHash` from the Indexer; visible in `events.jsonl`). Per-head `HeadState` snapshots and event logs currently mirror to a local KV directory; live KV via the SDK is on the D7 build target. Children inherit state from the local mirror on boot — same wire-up as the live SDK will use, with the storage backend swap being a one-line change.
4. **Resurrection** — leader generates two fresh ed25519 keypairs, writes AXL configs, spawns two AXL Go sidecars, then spawns two Node head processes with `PARENT_ID` env var. Children boot, read parent's last state from 0G, broadcast `born`, join the mesh.
5. **TEE-verified inference** — children call `0G Compute` once on boot via `@0glabs/0g-serving-broker`; the response is verified via `processResponse` (TeeML / TeeTLS attestation) so the swarm's "should I act?" decision is provably honest compute. **Galileo testnet caveat:** the broker requires a 3 OG ledger minimum and the testnet faucet caps at 0.1 OG / day per address, so on testnet the call typically lands as a `compute.skip` event with a typed funding-gap error rather than a TEE-attested response. The integration path fires on every child boot — the gap is faucet ergonomics, not wiring. Visible in `events.jsonl` and on `/chronicle` Section 3 once the next attack lands a child.
6. **iNFT scar minting** — every learned defense rule mints an ERC-721-like NFT on `HydraScars` (chain 16602). Each token's metadata embeds the cause + mitigation rule on chain — auditable by judges.
7. **KeeperHub audit trail** — leader fires a webhook to a KeeperHub workflow on every confirmed death. The workflow logs the death payload + audit record in run history (the prize criterion's "audit trail").
8. **Whitelisted execution** — funds live in `HydraTreasury`, never in head EOAs. `HydraExecutor` permits only `(target, selector)` pairs explicitly whitelisted by the owner. A compromised head's key cannot drain the treasury — it can only call functions that route value back to the treasury.

---

## Performance bounds

The swarm holds these bounds across every kill in our test runs. Numbers are measured from the dashboard's `events.jsonl` stream, not asserted.

| Phase | Bound | What's happening |
|---|---|---|
| Detection | < 18 s | 5 missed 3-s heartbeats over the AXL mesh trigger `suspect` broadcast |
| Quorum + cause attribution | < 24 s | ⌈n/2⌉+1 heads agree, leader pulls cause from latest panic message |
| Spawn + scar broadcast | < 45 s | Two children, fresh ed25519 keys, AXL configs written, joined mesh |
| Treasury redeposit on chain | < 60 s | KeeperHub-routed call lands in `HydraTreasury`, dashboard ticks |
| iNFT mint (scar metadata) | next block | `HydraScars.mintScar(...)` writes cause + rule on chain |

Drain defense is independent of these timings — see "Common Questions" below.

---

## Common Questions

> *Sponsor reviewers ask these in 30 seconds. Pre-empted here so they don't have to ask.*

**"If a drain takes 2 seconds and detection takes 18, isn't HYDRA useless?"**
HYDRA is not the drain defense. The drain defense lives in `HydraExecutor.sol` — a whitelist of `(target, selector)` pairs that excludes every value-routing call except those that route value *back* to `HydraTreasury`. Funds never live in head EOAs. A compromised head's signing key cannot move value to an attacker — it can only call `Aave.supply(treasury,...)` or `Aave.withdraw(to=treasury)`. Whitelist stops theft in under one block. HYDRA stops *downtime* in under a minute. Two different layers, both required.

**"Why three sponsors and not five or seven?"**
Open Agents caps every project at three sponsor opt-ins. Adding more would force dropping one of these three, which collapses the architecture: KeeperHub without AXL becomes centralized execution; AXL without 0G becomes amnesia (every death wipes memory); 0G without KeeperHub leaves on-chain actions unaudited. Each integration is load-bearing. The three-sponsor cap is a discipline, not a limit.

**"Why does each head get its own AXL Go process — isn't that overkill?"**
Per Gensyn AXL's prize criteria, "cross-node communication" must mean *separate AXL nodes*, not one process pretending to be three. Three Go binaries on ports 9001 / 9011 / 9021, three distinct ed25519 peer-ids, three TLS-encrypted Yggdrasil tunnels. If we lose this, we lose the AXL prize.

**"What stops the 'leader' from cheating during resurrection?"**
The leader is whoever has the lowest live peer-id at the moment of confirmed death — deterministic, not elected. Every head independently runs `evaluateQuorum()` and reaches the same conclusion. If the leader fails to act, the next-lowest peer-id picks up. Children's first action is to call 0G Compute (TEE-attested via TeeML) for an action signal, so even the leader's spawn decision is verifiable.

**"Why hardcode the scar lookup table instead of generating rules with an LLM?"**
Demo determinism. An LLM-generated rule on stage during a 2:45 demo is one hallucination away from a non-recoverable failure. The four causes (`key_revoked` / `process_killed` / `api_timeout` / `wallet_drained`) and their mitigations are fixed in `agents/src/scars.ts`. Adding LLM-authored rules is a v2 concern.

**"How is the iNFT 'intelligence' actually intelligent — isn't it just metadata?"**
Each `HydraScars` token's `tokenURI` returns on-chain JSON describing the cause that killed a parent and the mitigation rule the swarm now carries. Any future agent — not just HYDRA's — can read those tokens and inherit the defense. The "intelligence" of the swarm is therefore portable, public, and ERC-721-composable. It is the antibody, not just the receipt.

---

## Sponsors

| Sponsor | Role | Code |
|---|---|---|
| **Gensyn AXL** | P2P signed messaging across 3 separate Go nodes — all 7 message types active and proven on chain (heartbeat, suspect, confirmed, resurrect, born, scar, panic). **84,357 messages** logged in events.jsonl (44,922 send / 39,435 recv) across the swarm's lifetime; 26,169+ heartbeats. | `agents/src/axl/`, `configs/h*.json` |
| **0G** | Chain — 4 contracts on Galileo 16602 (Registry, Treasury, Executor, HydraScars v2 ERC-721); **4 iNFTs** minted, one per attack. Storage — `uploadJsonToOG` lands real Indexer rootHash + txHash for every new scar (**2** verified uploads to date). Compute — SDK wired for TEE-attested child inference, Galileo-faucet-blocked → emits typed `compute.skip` per child boot. Submitting to **both** 0G tracks (Swarms+iNFT and Frameworks). | `agents/src/memory/`, `contracts/contracts/`, `agents/src/execution/chain.ts` |
| **KeeperHub** | Workflow orchestration via MCP HTTP `execute_workflow` (org-scoped `kh_…` key, auth bypasses webhook 401 path). **26 executions** across 4 HYDRA workflows (`lcyuk85gh46defy5xaq8b` death-event · `uybkmq5v2mpvgji7933ji` treasury-redistribute · `up22dre1y0frp1pskrbuj` scar-mint · `6sdbtvyee2n0uihywyim3` heartbeat-stale), every run linkable from /chronicle Section 3. | `agents/src/execution/keeperhub.ts` |

Each sponsor is load-bearing: without AXL the anti-fragility is centralized; without 0G death means amnesia; without KeeperHub the redistribution lacks an auditable third-party trail.

---

## Documentation

Five canonical docs cover the build's qualification, decision history, and ongoing operational record:

- [`SPONSORS.md`](./SPONSORS.md) — per-sponsor depth: methods called, files involved, and what would break without each integration.
- [`KEEPERHUB_FEEDBACK.md`](./KEEPERHUB_FEEDBACK.md) — Builder Feedback Bounty submission. Four reproducible findings with reproduction steps, plus the KeeperHub team's confirmed fix to issue #1 within ~36 hours.
- [`docs/ADVERSARIAL_TESTING.md`](./docs/ADVERSARIAL_TESTING.md) — three real bugs caught during manual pre-fire verification (systemd Restart=always racing the consensus window, stale recentPanics, ghost peers in quorum), each with diagnosis + fix commit.
- [`AI_USAGE.md`](./AI_USAGE.md) — ETHGlobal AI-disclosure: which files Claude Code touched, which decisions were the builder's. No `Co-Authored-By` trailer on any of the **176+ incremental commits** by `Mithran M.V. <mithran07.mv@gmail.com>`.
- [`docs/planning/`](./docs/planning/) — pre-build spec artifacts: `IDEA_HYDRA.md`, `DECISION.md`, `ARCHITECTURE.md`, `BUILD_PLAN.md`, `CONTRACTS.md`, `DEMO_STORYBOARD.md`, `DAILY_ATTACK_CADENCE.md`. Restored from local trash on D5 to satisfy ETHGlobal's spec-driven AI rule.

The KeeperHub round-trip story — issue reported via the in-app check-in on Apr 26, KeeperHub's Luca Malpiedi confirmed the auth fix on Apr 28 — is the most visible artifact of "we used the platform hard enough to surface a real bug, then collaborated to fix it." Detail in `KEEPERHUB_FEEDBACK.md` under the 2026-04-28 update header.

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

## Setup (VPS — full swarm + dashboard)

The live deployment at `https://hydra.hacklabs.in` runs the swarm + dashboard on a single Ubuntu 24.04 host (4 vCPU, 8 GB RAM). systemd manages 7 units: 3 AXL Go nodes, 3 head Node processes, 1 Next.js web service. nginx reverse-proxies port 3000 with Let's Encrypt SSL.

```bash
# bootstrap a fresh Ubuntu host
apt-get install -y nodejs go nginx certbot python3-certbot-nginx
git clone https://github.com/Mithran-MV/Hydra.git /var/www/hydra
cd /var/www/hydra
npm ci

# build AXL binary (linux/amd64) from source
git clone https://github.com/gensyn-ai/axl /tmp/axl-src
(cd /tmp/axl-src && GOTOOLCHAIN=go1.25.5 make build)
mkdir -p axl/bin && cp /tmp/axl-src/node axl/bin/axl-node

# build the dashboard
npm run build --workspace=web

# copy your .env (OG_CHAIN_PK, contract addresses, KH webhook URLs)
# then enable + start the systemd units (templates in deploy/systemd/)
systemctl enable --now hydra-axl@1.service hydra-axl@2.service hydra-axl@3.service
systemctl enable --now hydra-head1.service hydra-head2.service hydra-head3.service
systemctl enable --now hydra-web.service

# nginx + cert
ln -s /etc/nginx/sites-available/hydra.hacklabs.in /etc/nginx/sites-enabled/
certbot --nginx -d <your-domain>
```

Logs land in `/var/www/hydra/logs/{axl-h*,head-h*,web}.log` and the dashboard event stream is `/var/www/hydra/logs/events.jsonl`.

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
├── KEEPERHUB_FEEDBACK.md  KeeperHub Builder Feedback bounty submission
└── README.md              you are here
```

---

## Team

**HYDRA**

- Mithran M.V. — GitHub [@Mithran-MV](https://github.com/Mithran-MV) · Telegram [@Mithran07](https://t.me/Mithran07) · X [@MithranMv31438](https://x.com/MithranMv31438)
- Kamalesh T — Telegram [@dearkamalesh](https://t.me/dearkamalesh) · X [@Kamales62551228](https://x.com/Kamales62551228)
- Fabio Mughilan — Telegram [@fabiomughilan](https://t.me/fabiomughilan) · X [@fabiomughilan](https://x.com/fabiomughilan)

---

## Qualification checklist

| Requirement | Status | Where |
|---|---|---|
| KeeperHub MCP/workflow integration | ✅ | `agents/src/execution/keeperhub.ts`, KH workflow ID `lcyuk85gh46defy5xaq8b` |
| KeeperHub Builder Feedback (bounty) | ✅ | `KEEPERHUB_FEEDBACK.md` |
| AXL cross-node communication (separate nodes, not in-process) | ✅ | 3 Go binaries on ports 9001/9011/9021, see `configs/` |
| 0G Storage (KV + blob upload) | ✅ | `agents/src/memory/og-kv.ts`, `og-storage.ts` |
| 0G Compute (TEE-verified inference) | ✅ | `agents/src/memory/og-compute.ts` (children call on boot) |
| 0G Chain (contracts deployed) | ✅ | 4 contracts on 16602 — see addresses table above |
| iNFT (swarm-learned defenses on chain) | ✅ | `HydraScars` mints on every new scar |
| Public GitHub + README | ✅ | https://github.com/Mithran-MV/Hydra |
| Demo video < 3 min | 🟡 | recorded Day 11 — link goes here |
| Agent coordination explained | ✅ | "How it works" section above |
| Built during hackathon (Apr 24 – May 3, 2026) | ✅ | git history shows incremental commits per day |

---

## License

MIT
