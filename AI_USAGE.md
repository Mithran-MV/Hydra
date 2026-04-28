# AI usage disclosure

Per ETHGlobal's policy, hackathon projects must disclose AI assistance. HYDRA was built by Mithran M.V. (solo) using **Claude Code** (Anthropic) as a coding co-pilot during the Apr 24 – May 6 2026 window. No pre-existing code was used.

## What Claude was used for

- **Scaffolding boilerplate.** Hardhat config, AXL config JSON shapes, systemd unit templates, dotenv plumbing.
- **TypeScript types + glue.** The `shared/types.ts` union (AXLMessage / HeadState / Scar / SwarmSnapshot) and the SSE route's snapshot reducer were drafted with Claude, then hand-edited.
- **SDK integration paths.** Claude helped translate 0G SDK examples into the working `og-kv.ts` / `og-log.ts` / `og-compute.ts` modules, including the `createRequire` workaround for the published ESM bundle and the typed funding-gap error in `ask()`.
- **Solidity drafts.** Initial pass on `HydraRegistry`, `HydraTreasury`, `HydraExecutor`, `HydraScars`. Reviewed line-by-line, simplified, and deployed manually.
- **Dashboard frontend.** D3 force-directed graph wiring (`SwarmGraph`), SSE consumer in `dashboard/page.tsx`, the dashboard CSS animations (head-spawn / death-pulse / scar-reveal).
- **Demo orchestration.** `demo/full-demo.sh`, `demo/kill.sh`, `demo/reset.sh`.
- **Documentation.** README structure, KEEPERHUB_FEEDBACK.md drafting (then rewritten in the builder's voice), SPONSORS.md, this file.

## What Claude was NOT used for

- **Architecture decisions.** The 3-sponsor cap discipline, the 4-layer drain reframe, the "scars as iNFTs" mechanism, the "lowest-peer-id leader" choice, and the 4-cause hardcoded scar table are the builder's design — Claude helped *implement* them, not invent them.
- **Sponsor selection.** The KH+AXL+0G choice and the explicit decision to *not* opt into Uniswap/ENS were made by the builder before any AI sessions on these files.
- **Wallets, keys, and signing.** All key generation (`openssl genpkey -algorithm ed25519`) and signing operations were done locally by the builder.
- **The hackathon submission writeup.** Final form is the builder's words.

## Adversarial testing

Three real bugs were caught via manual pre-fire verification before each automated kill cadence step (`systemd Restart=always` racing the consensus window, stale `recentPanics` blocking fresh causes, ghost peers inflating the quorum threshold). Full diagnosis + fixes in [`docs/ADVERSARIAL_TESTING.md`](./docs/ADVERSARIAL_TESTING.md). The pattern was: AI helped *propose* the fix, the builder verified it against a live deployment, and the bug + fix shipped as one tightly-scoped commit each — not as a "while we're here" cleanup.

## How to verify

Every commit's author + committer is `Mithran M.V. <mithran07.mv@gmail.com>`. There are no `Co-Authored-By` trailers — per ETHGlobal's *"Only the participant commits"* rule, AI co-authorship is disclosed here in prose, not in commit metadata.

Git history is incremental — one logical change per commit, no `wip` / blob-imports — per ETHGlobal's *"Any repositories with single commits of large files without proper history will be default assumed to be unqualified"* rule.

## Tools used

- **Claude Code** (Anthropic CLI) — primary co-pilot, multi-file edits, debugging.
- **Cursor** — occasional inline completions.
- **GitHub Copilot** — none.

If a sponsor reviewer wants any specific file's AI-assistance breakdown, the commit messages capture intent per change — open one and the diff shows exactly what was added.
