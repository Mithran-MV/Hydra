# HYDRA — Demo storyboard

**Target length:** 2:45
**Hard cap:** 3:00
**Format:** screen recording + voiceover
**Output:** MP4 + YouTube unlisted + linked in README

Every shot is listed with: **visual** · **audio** · **duration** · **what must be on screen**.

---

## Shot 0 — Cold open (0:00 – 0:08)

**Visual:** Fade in to black. White serif text centered: *"Every agent system today is fragile."*  
Hold 2 seconds. Fade. New text: *"One compromised key. Everything stops."*  
Hold 2 seconds. Fade.

**Audio:** Silent. Or a single low cello note.

**Duration:** 8s

**Must show:** nothing but the two text frames. Set the stakes before showing anything technical.

---

## Shot 1 — The three-headed status quo (0:08 – 0:30)

**Visual:** Hard cut to the dashboard. Clean, dark background. Three green nodes in the force graph, labeled:
- Head 1 · Aave deposit · +$12 P&L
- Head 2 · UniV4 LP · +$8 P&L
- Head 3 · Payroll · scheduled

Heartbeat pulses animate between nodes every 3s. Header stats: **Generation 0 · 3 heads · 0 scars · $2,500 AUM · 0 attacks survived**. ScarTimeline at bottom: empty (gray placeholder).

**Audio (VO):**  
> "This is HYDRA. A swarm of three agents managing a small DeFi position together. Each agent runs on its own Gensyn AXL node. They whisper heartbeats to each other, and they execute every on-chain action through KeeperHub."

**Duration:** 22s

**Must show:** the three labeled heads, heartbeat pulses clearly visible, stat header readable, ScarTimeline empty.

---

## Shot 2 — First blood (0:30 – 0:55)

**Visual:** Mouse moves to the "Kill Controls" floating panel. Click `Kill Head 2 (revoke key)`. Terminal briefly flashes on side showing `axl key revoked for head-2`. Back to the graph: Head 2's heartbeat pulse stops. Within 5s the node turns yellow (suspected). Event log fires:
- `[13s] head-1 → broadcast suspect target=head-2`
- `[15s] head-3 → broadcast suspect target=head-2`
- `[16s] consensus: head-2 confirmed dead · cause=key_revoked`

Node 2 turns red. Header stat flickers: `1 attacks survived`.

**Audio (VO):**  
> "Watch what happens when I kill Head 2. I'm going to revoke its signing key — exactly the kind of attack that takes real keeper networks down. In a normal system, this is the end of the story."

**Duration:** 25s

**Must show:** the kill action clearly (big button, terminal flash), the suspected → dead transition, at least two suspect messages in the event log, the header counter flickering up.

---

## Shot 3 — Consensus fires (0:55 – 1:10)

**Visual:** Zoom in slightly on the two surviving heads. A brief animated overlay: "Leader elected: head-1". Graph shows a "resurrection arrow" from head-1 toward the dead head's position.

**Audio (VO):**  
> "The surviving heads reach consensus. They've noticed Head 2 went silent. Head 1 — the lowest peer ID — is elected leader for the resurrection."

**Duration:** 15s

**Must show:** "leader elected" overlay, resurrection arrow appearing.

---

## Shot 4 — Memory retrieval from 0G (1:10 – 1:30)

**Visual:** Side panel slides in showing a JSON preview of Head 2's last state fetched from 0G Storage. Fields visible: strategy, balance, position, lastDecision. A small "0G Storage" badge glows. Another badge: "Scar registry: reading scars/global".

**Audio (VO):**  
> "Before Head 2 died, it was continuously writing state to 0G Storage. Every decision, every balance change, appended to an immutable log. The leader retrieves Head 2's final memory — and the swarm's shared scar registry — from 0G."

**Duration:** 20s

**Must show:** JSON preview with real-looking data, 0G badges clearly visible, brief hover on the data so viewers can read it.

---

## Shot 5 — Resurrection (1:30 – 1:55)

**Visual:** Two new nodes fade in (purple), labeled "Head 2a" and "Head 2b". They connect to the mesh — edges animate between them and the surviving heads. Color transitions purple → green within 5 seconds.

Below, a KeeperHub panel animates: "Emergency redistribution: simulate → execute". Transaction hash appears, links to 0G Chain explorer.

Header updates live: **Generation 1 · 4 heads · 1 scar · $2,497 AUM · 1 attack survived**.

**Audio (VO):**  
> "Two children spawn. They inherit Head 2's memory from 0G. KeeperHub atomically redistributes the dead agent's position to the two new heads — simulated first, executed privately to avoid MEV. Now we have four heads where we had three."

**Duration:** 25s

**Must show:** two new nodes appearing distinctly, the AUM number barely moves (proving no value was lost), the KeeperHub tx hash visible and clickable, generation incremented.

---

## Shot 6 — The scar (1:55 – 2:15)

**Visual:** ScarTimeline at bottom animates — an empty card slides in from left. Card fills with: **Scar #1 · key_revoked · rotate-keys-every-60s + use-backup-signer · learned from Head 2 · Gen 1**. Icon: small key with a rotating arrow.

**Audio (VO):**  
> "And here's the heart of it. The children didn't just inherit Head 2's memory — they inherited a scar. A specific defense against the exact attack that killed their parent. Every surviving head in the mesh now knows: rotate keys every 60 seconds, fall back to the backup signer on revocation. The network didn't just survive. It learned."

**Duration:** 20s

**Must show:** scar card clearly readable, all fields visible, icon present.

---

## Shot 7 — Double kill stress test (2:15 – 2:40)

**Visual:** Click "Double kill: head-3 + head-2a (process_killed + wallet_drained)". Both nodes turn yellow → red simultaneously. Two resurrections fire in parallel. Four new purple nodes fade in, connect to the mesh. Header: **Generation 3 · 6 heads · 3 scars · $2,493 AUM · 3 attacks survived**. ScarTimeline now has three cards.

**Audio (VO):**  
> "Watch what happens when I kill two heads at once with two different attacks. Both deaths detected. Four children spawn in parallel. The swarm doubled its knowledge. Six heads, three scars, every attack documented on-chain."

**Duration:** 25s

**Must show:** both kills happen simultaneously, four new heads clearly appear, three distinct scars visible in the timeline, the generation counter hitting 3.

---

## Shot 8 — The punchline (2:40 – 2:45)

**Visual:** Slow zoom out to see the full graph — 6 green heads, edges pulsing. ScarTimeline with three scar cards. AUM ticker stays positive. Text overlay at bottom: *"Every attack made us stronger. You can't kill the HYDRA."*  
Fade to black.

End card (2-3 seconds) with: GitHub URL, contract address on 0G Chain, team name (VLOG Innovations), sponsor logos (KeeperHub · Gensyn AXL · 0G).

**Audio (VO):**  
> "Every attack made us stronger. Every death made us smarter. Every generation carries more defenses. You can't kill the HYDRA."

**Duration:** 5s + 3s end card

**Must show:** six heads visible simultaneously, text overlay readable, end card sponsor logos.

---

## On-screen elements judges must see at some point

Cross-check before publishing — each of these must appear clearly in at least one shot:

- [ ] "AXL" label or badge (Shots 1, 3)
- [ ] Cross-node communication (event log showing messages between peers — Shots 2, 3)
- [ ] "0G Storage" badge with data retrieval (Shot 4)
- [ ] "0G Compute" — can be a small badge during Shot 5 when children spawn ("born on 0G Compute")
- [ ] Contract address or tx hash on 0G Chain explorer (Shot 5, optionally Shot 7)
- [ ] "KeeperHub" panel with simulate → execute flow (Shot 5)
- [ ] KeeperHub features called out: tx simulation, retry, private routing (in VO or overlay, Shot 5)
- [ ] Memory inheritance made visible (JSON preview, Shot 4)
- [ ] Scar rule text readable (Shot 6)
- [ ] AUM staying constant across deaths (header throughout)

---

## Reset script (between takes)

```bash
# wipe 0G demo namespace
./scripts/reset-0g.sh hydra-demo
# stop & restart all heads
docker compose down && docker compose up -d
# seed treasury
npm run seed-demo --workspace=contracts
# open dashboard fresh
open http://localhost:3000
```

Verify before recording: 3 green heads, 0 scars, AUM = $2,500.

---

## What NOT to show

- Long boot logs. Edit them out.
- Trial-and-error kills. Record clean.
- The dashboard loading state. Cut to it already loaded.
- Multiple browser windows / dev tools. Clean desktop.
- Your face. The graph is the star.
- Self-congratulation. Let the swarm do the talking.

---

## Voiceover notes

- **Pace**: slightly slower than normal conversation. Judges hearing this cold will miss fast narration.
- **Tone**: confident, not dramatic. Let the word "HYDRA" carry the drama.
- **One pause** before "And here's the heart of it" (Shot 6) — that's the emotional beat.
- **Cut breath sounds** between sentences if using Descript.

---

## Fallback if something breaks during recording

- **0G Compute call fails mid-demo**: cut the "born on 0G Compute" badge from Shot 5, mention it in VO as "children's inference runs on 0G Compute" without showing a live call. Show a successful one from earlier run in the end card as a screenshot.
- **KeeperHub tx delays**: record the tx hash appearing, pause the video at that frame in the edit, add a caption: "KeeperHub private routing: 3-5s typical".
- **AXL peer discovery slow**: pre-warm before recording. Run the compose up 30s before hitting record so the mesh is already stable.
- **Docker crashes**: reset script + restart. If Docker flakes in the middle of a take, abort, restart, re-record from cold open.
