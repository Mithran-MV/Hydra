# Incidents

> Operational record of production failures HYDRA has hit during the
> hackathon — what broke, how we caught it, what we changed. Code-level
> bugs caught during testing live in `ADVERSARIAL_TESTING.md`; this file
> is for production-state incidents.

---

## I-1 — Silent mesh degradation after attack run, ~23h before noticed

**Date:** 2026-04-29 ~23:00 IST (detected; root cause Apr 28 evening)

**Symptom.** `/chronicle` Codex iv "heartbeat stream" panel showed zero
fresh rows. Diagnostic from outside:

```
refreshedAt:        1777485672995  (now)
events[0].ts:       1777425073481  (~17h ago)
lastMinuteCount:    0
totals.heartbeat:   77,522         (lots before, none recently)
```

`/api/axl-recent` itself was healthy — `refreshedAt` updated between
calls, `Cache-Control: no-store` honored. The data was honest: there
genuinely had been no incoming heartbeats received for ~17 hours.

**Detection.** External user-side check of the live API endpoint values,
spotting the impossible age of `events[0].ts` against `refreshedAt`.

**Root cause.** `hydra-head2.service` and `hydra-head3.service` were both
inactive (systemd state `inactive (dead)`):

| Unit              | Last state change             |
|-------------------|-------------------------------|
| `hydra-head2`     | Stopped 2026-04-29 00:10:19   |
| `hydra-head3`     | Stopped 2026-04-28 23:47:43   |
| `hydra-head1`     | active (running 16h+)         |
| `hydra-axl@{1,2,3}` | active (running 16h+)       |

The unit files do have `Restart=always`/`RestartSec=3`, but
`systemctl stop` puts a unit into `inactive` state with auto-restart
**suppressed** — that's by design, and `demo/kill.sh` deliberately uses
`systemctl stop` to simulate process kills (see Bug 1 in
`ADVERSARIAL_TESTING.md`). The attack cadence runs left h2 and h3 stopped,
and there is no separate recovery step after each attack — the agent
layer "resurrects" by spawning child heads in-process, but the systemd
unit for the killed head remains dead.

With only h1 alive, h1 kept sending heartbeats every 3s into the void
(200 `axl.send`/heartbeat events in the last 5min before the fix).
But there were no peers to receive, so 0 `axl.recv`/heartbeat events,
and the chronicle panel — which counts received — correctly showed zero.

**Fix.** `systemctl start hydra-head2 hydra-head3`. Within ~15s:

```
last 60s: axl.send/heartbeat=110, axl.recv/heartbeat=124
distinct receiving heads: 3
```

Verified live: `/api/axl-recent` `lastMinuteCount=50`, `events[0]` 2s old,
all three distinct head ids appearing as receivers.

**Lessons.**

1. **The chronicle UI conflates "received" with "alive".** A
   `lastMinuteCount: 0` reading actually meant "I'm broadcasting but
   nobody is listening" — same as full-mesh-dead from outside. A future
   v2 indicator should track *sent vs. received* separately and surface
   "swarm partial" (some heads alive) vs. "swarm dormant" (no heads
   alive) as distinct states.

2. **A simple watchdog for h2/h3 won't work** because it would conflict
   with the attack semantics — `systemctl stop` is intentional during a
   kill drill, and an auto-restart 30s later would erase the post-attack
   narrative we want judges to see. The right fix is at the UI/API
   layer: better state surfacing, not a recovery cron.

3. **Postmortems before the journalctl ring rotates.** Captured to
   `docs/postmortems/hydra-{head1,head2,head3,axl-1,axl-2,axl-3}-2026-04-29.log`
   (`journalctl --since "30 hours ago" --no-pager`) so the actual
   `Stopped` events from the kill cadence are preserved as trace
   evidence even after journal rotation.

**Status:** resolved (services restarted). UI improvement (lesson 1)
filed as a v2 item; not blocking submission.
