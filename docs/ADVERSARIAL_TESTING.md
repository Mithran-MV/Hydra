# Adversarial testing notes

> Three real bugs surfaced inside HYDRA's own kill harness during a
> single afternoon's verification pass. Each was caught BEFORE it
> shipped to demo day. This file is the public record — both because
> rigor deserves a paper trail, and because it's the kind of "we
> stress-tested ourselves, not just our marketing" evidence sponsor
> reviewers respect.

The setup: `hydra.hacklabs.in` runs the live swarm (3 originals on systemd, AXL mesh, Treasury on chain). Attack #1 (`process_killed` on h2) had worked at 11:52 UTC. Attack #2 (`wallet_drained` on h1) was scheduled for 18:11 IST as a self-paced cadence step.

Before letting the timer fire, I ran the same script manually as a smoke test. Three bugs cascaded out.

---

## Bug 1 — systemd `Restart=always` racing the consensus window

**Symptom.** `./demo/kill.sh 1 --cause wallet_drained` ran cleanly. head-1 took SIGTERM and exited. No fresh on-chain tx hashes appeared.

**Diagnosis.** kill.sh used `kill -TERM <pid>` directly. systemd's unit file has `Restart=always RestartSec=3`. Within ~5 s of the SIGTERM, systemd respawned head-1 with the same ed25519 identity (loaded from `keys/h1.pem`). Surviving heads saw heartbeats from head-1 again before the 15 s scanner suspect threshold expired. No quorum, no resurrection, no scar.

**The race in numbers:**

```
T+0.0s   kill.sh broadcasts panic (cause=wallet_drained)
T+0.0s   kill.sh sends SIGTERM to head-1
T+0.5s   head-1 exits
T+3.0s   systemd RestartSec elapses → Restart=always triggers
T+5.0s   head-1 booting again with same identity
T+8.0s   head-1 healthy, heartbeating to peers
T+15.0s  scanner threshold — but heartbeats are fresh, no suspect raised
```

**Fix.** `demo/kill.sh` now detects whether the head is a systemd unit (`systemctl list-unit-files hydra-head${i}.service`) and uses `systemctl stop` if so. `systemctl stop` puts the unit in `inactive` state with auto-restart suppressed. Falls back to PID-kill on dev laptops without systemd. Same logic for the AXL sidecar.

**Commit:** `c39712b fix(demo/kill): use systemctl stop when head is a systemd unit`

**Reframe for demo:** *"In the real world, attackers don't wait for your consensus window. We found this race in our own tooling — and the fix lets HYDRA see deaths systemd would have hidden."*

---

## Bug 2 — stale `recentPanics` blocking fresh causes

**Symptom.** With Bug 1 fixed, the second attack triggered consensus and resurrection — but the cause attached to the death event was `process_killed`, not the `wallet_drained` I'd injected. Three on-chain tx hashes appeared, but no scar mint (since process_killed was already in the registry from attack #1).

**Diagnosis.** `consensus.handlePanic` was implementing first-panic-wins via a naive `if (!recentPanics.has(msg.from))` check. The `inferCause` function had a 30 s freshness window, but `handlePanic` did not. A `process_killed` panic from a prior cleanup-restart of head-1 (41 s before the new attack) had populated `recentPanics["head-1"] = { cause: process_killed, ts: T-41s }`. When the fresh `wallet_drained` panic arrived, the `has()` check returned true and silently rejected it. Then when quorum confirmed at T+16 s, `inferCause` looked up the stale entry, found it 57 s old (> 30 s), returned the default `process_killed`. Wrong cause, but coincidentally identical so easy to miss.

**Fix.** `handlePanic` now applies the same 30 s freshness gate as `inferCause`:

```ts
const existing = recentPanics.get(msg.from);
const isStale = existing && Date.now() - existing.ts >= 30_000;
if (!existing || isStale) {
  recentPanics.set(msg.from, { cause: msg.reason as DeathCause, ts: msg.ts });
}
```

Genuine first-panic-wins still holds *within* a 30 s window. Across windows, the stale entry no longer blocks the fresh cause.

**Commit:** `1ada9bf fix(consensus): expire stale entries in recentPanics before first-panic-wins`

---

## Bug 3 — quorum threshold inflated by ghost peers

**Symptom.** With Bugs 1 + 2 fixed, the third attempt got *closer* — `wallet_drained` panic registered on head-3 (the surviving witness), the scanner saw head-1 missing heartbeats, head-3 broadcast `suspect`. Then nothing. No CONFIRMED. 80 s elapsed, suspect-only, stalled.

**Diagnosis.** `evaluateQuorum` counted `mesh.livePeers().length + 1` for the quorum denominator. `mesh.livePeers()` returns every peer with `status !== "dead"` — including peers loaded from `keys/*.pem` at boot with `lastSeen === 0` (never heartbeated). Head-3 had been restarted to clear stale recentPanics from Bug 2's diagnosis; that restart re-loaded h2's identity from `keys/h2.pem` with `lastSeen = 0`. Even though h2 has been actually dead since attack #1 hours earlier, head-3's mesh now had it as `status: "alive"`. Quorum math: `live = [h2-ghost] = 1`, `total = 2`, `required = 2`. With only head-3 in the suspecters set (size = 1), quorum was unreachable. Single-witness consensus impossible.

**Fix.** `evaluateQuorum` now applies a freshness filter that mirrors what the scanner already does for self-suspect:

```ts
const now = Date.now();
const live = ctx.mesh.livePeers().filter(
  (p) =>
    p.id !== target &&
    p.lastSeen > 0 &&
    now - p.lastSeen <= SUSPECTED_AFTER_MS,
);
```

`mesh.livePeers()` semantics are unchanged so heartbeat broadcast still bootstraps correctly at boot. Only the quorum + leader-election inputs are tightened to "peers I've actually heard from recently."

**Commit:** `3833b8b fix(consensus): exclude never-heartbeated peers from quorum count`

---

## After all three fixes

Attack #2 fired cleanly at 12:45:09 UTC. Detection at +15.7 s, quorum at +16.8 s, resurrection complete at +20.4 s, full on-chain settlement (death + scar + iNFT mint + 2 born events) at +26.4 s. All five tx hashes verifiable on chainscan-galileo and pinned in README's "Live attacks captured" table. Cause attribution correct: `wallet_drained`. Second distinct scar minted; second iNFT in the swarm's on-chain inventory.

Three real bugs caught before demo day. The whole sequence is a stronger demo beat than a clean one-shot would have been: judges hear "we stress-tested our own harness, caught three race conditions, fixed them, captured proof in the same afternoon."

---

## What we still haven't checked

- **Scar-enforced defense.** A second `wallet_drained` attack against the live swarm should see the scar registry's existing mitigation (value cap + multi-sig) *block the drain* rather than re-resurrect. That's the real meaning of "anti-fragile" and currently the scar table just records — it doesn't enforce. Build task scheduled for D7 (Apr 30) per `docs/planning/DAILY_ATTACK_CADENCE.md`.
- **AXL message replay attacks.** What if an attacker captures and replays a `panic` with an old timestamp? The `ts` field is currently advisory. Mitigation: signed panic messages keyed off the dying head's identity, with monotonic-increasing nonces.
- **Leader-election deadlock.** If the lowest-peer-id leader is itself the next target, the next-lowest needs to take over. Currently handled by re-running `leaderOf` after each `confirmed` — but there's no test that exercises chained leader handoff under double-kill.

These are tracked as open items in the day-by-day plan; this file is updated whenever a new bug is caught + fixed in the same way.
