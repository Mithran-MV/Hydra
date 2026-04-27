# AI Usage Disclosure

ETH Global Open Agents Hackathon · April 24 – May 6, 2026
Project: HYDRA · Builder: Mithran M.V. <mithran07.mv@gmail.com>

This document discloses the use of AI coding assistants in building HYDRA, per
ETHGlobal's hackathon rules.

## Tools used

- **Claude Code** (Anthropic, model: `claude-opus-4-7`, 1M context window) — used as a pair-programmer over the build window. All commits in this repo were authored by Mithran M.V. (no `Co-Authored-By: Claude` trailers, per ETHGlobal's incremental-commit guidance).
- **Playwright MCP** — used to drive the KeeperHub web UI and to verify the dashboard rendered correctly.
- **KeeperHub MCP** — used to programmatically inspect available actions and execute the workflow during testing.

## How AI was directed

The build was directed by a planning corpus kept *outside* the repo at `~/Desktop/ethGlobal/planning/`:

- `00-MASTER-PLAN.md` — the strategic overview (sponsor mapping, prize math, schedule)
- `01-architecture.md` — system design with chain choices
- `02-sponsor-cheatsheet.md` — copy-paste-ready code snippets per sponsor
- `03-day-by-day.md` — daily deliverables and acceptance criteria
- `04-demo-storyboard.md` — the 2:45 demo cut shot-by-shot
- `05-submission-checklist.md` — per-prize requirements
- `06-feedback-md-draft.md` — running notes that became `FEEDBACK.md`

The AI executed against this plan; architectural decisions (chain choice, sponsor cap, cut list, security reframe) were made by Mithran. The plan documents are not in this repo per Mithran's instruction (they include strategy framing not relevant to graders).

## Files / parts where AI assisted

**AI-assisted, reviewed line-by-line:**

- `agents/src/**/*.ts` — agent runtime: identity, AXL client/mesh, heartbeat, consensus, resurrection, scars, diagnostics, 0G integration, KeeperHub webhook caller, strategies. AI generated initial drafts; protocol semantics (quorum math, leader election, panic-first-wins, message types) were specified by Mithran.
- `contracts/contracts/*.sol` — Registry, Treasury, Executor, Scars. AI drafted the contracts; the security model (whitelist over EOA custody, only-Executor mutations) is the architectural choice from `planning/01-architecture.md`.
- `web/components/**/*.tsx` — SwarmGraph (D3), HeadCard, TEEBadge, KeeperHubRunCard, dashboard layout. AI generated; visual design choices were Mithran's (colors from the existing palette, layout informed by the demo storyboard).
- `web/components/sections/*.tsx`, `web/components/three/*.tsx` — landing page (already shipped Day 0 of the build window). AI assisted with R3F scene + GSAP / Lenis / ScrollTrigger animations.
- `demo/*.sh` — orchestration scripts. AI scaffolded; Mithran adjusted port choices and cause flags.

**Mithran's direct work, reviewed by AI:**

- All commit messages and the commit chain layout (incremental, no bundling, no Co-Authored-By trailer per ETHGlobal disqualification rule).
- All sponsor selection, scope, and trade-off decisions.
- Wallet ops (decryption of the 0G dev key, faucet drips, private-key handling).
- KeeperHub workflow creation in their UI (Mithran clicked through the web app; AI guided via screenshots from a parallel Playwright session).
- Demo recording (when applicable) and submission form.

## Verification artifacts

Anyone reviewing this submission can verify the AI-disciplined commit hygiene:

```bash
git log --format="%H %an <%ae>" --grep="Co-Authored" | wc -l   # = 0
git log --format="%an <%ae>" | sort -u                          # = 1 author
```

All commits show `Mithran M.V. <mithran07.mv@gmail.com>` as both author and committer; zero `Co-Authored-By` trailers.

## Why this matters

ETHGlobal's rules permit AI assistance with disclosure. Submitting AI-generated code without disclosure — or pre-existing code without authorization — is grounds for prize revocation and a permanent ban from ETHGlobal events. Mithran chose to disclose proactively and in detail.
