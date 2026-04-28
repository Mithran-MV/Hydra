# HYDRA Attack #2 — wallet_drained on h1 — captured 2026-04-28 12:45 UTC

## Phase 1 — kill.sh emits panic broadcast (12:45:09)

Source: kill.sh stdout

    → killing head-1 (pid=10442) cause=wallet_drained
    panic → head-2
    panic → head-3
    → systemctl stop hydra-head1.service (disables auto-restart)
    → stopping AXL sidecar pid=10130
    ✓ head-1 killed

## Phase 2 — head-3 (witness) — consensus + resurrection

[12:45:09.796] [head-3] WARN PANIC from 182cc7e770…: wallet_drained
[12:45:10.299] [head-3] WARN PANIC from 182cc7e770…: process_killed
[12:45:25.921] [head-3] WARN 👁️  suspect: 182cc7e770…
[12:45:25.922] [head-3] ERR ☠️  CONFIRMED dead: 182cc7e770…  cause=wallet_drained
[12:45:25.922] [head-3] 👑 leader for resurrection of 182cc7e770…
[12:45:25.924] [head-3] scar persisted: wallet_drained → halt strategy + require multi-sig approval for next action
[12:45:25.928] [head-3] ERR 🔥 RESURRECTING 182cc7e770…  cause=wallet_drained
[12:45:25.930] [head-3] 👶 spawning child h8 (parent 182cc7e770…)
[12:45:26.193] [head-3] 👶 spawning child h9 (parent 182cc7e770…)
[12:45:29.460] [head-3] ✨ resurrection complete: 2 children spawned (h8, h9)
[12:45:31.453] [head-3] 📜 chain death recorded: wallet_drained → 0x98c068d469c9929ebad399aa8e4d5663b3008a44ed93458edfa6d33ff5b6edf2
[12:45:32.457] [head-3] 📜 chain scar recorded: wallet_drained → 0x808b6ee22dfbcb4f8fd64a56d0ff064ee4f7f134eb1f9df462cc272d0d95ea17
[12:45:33.458] [head-3] 🎴 iNFT scar minted: wallet_drained → 0xb6dfa3ba4ce6858a4a6416dfe3582b77073a4e9bdf4aa069af519bc3a0dbf56b
[12:45:34.461] [head-3] 📜 chain born recorded: 0x4fc4eb26a827b3f8e80f3de430548ff4cac9419692f85e530c742ae0646981db
[12:45:35.462] [head-3] 📜 chain born recorded: 0xb2e8ac840aac23bf3fea787ba906cde64c33ccfbc504591a97ff7f6677bccbff

## Phase 3 — systemd lifecycle for AXL nodes

hydra-axl@1.service: Deactivated successfully.
hydra-axl@1.service: Consumed 10.626s CPU time.
hydra-axl@1.service: Scheduled restart job, restart counter is at 4.
Started hydra-axl@1.service - HYDRA AXL node h1.

## Phase 4 — final swarm state (snapshot from /api/events)

data: {"generation":1,"heads":[{"id":"7404c8786356058e9bb4fee93365dca39467d4f8a04ef4dd80311dcf4574dd0b","generation":1,"parent":"182cc7e7707917984d1bde90bd1b6ad1f22134877ac9d45b9dba7643c6837ba7","status":"healthy","strategy":"aave_deposit","wallet":"0x0AE3342A04BABd620Ce4CdEBB705b21F548aD512","balance":"1000000000000000","position":null,"lastHeartbeatAt":1777380607726,"inheritedScars":["scar_process_killed_1777377166658","scar_wallet_drained_1777380325923"],"bornAt":1777380328704,"deathCause":null},{"id":"9d290b2a93c6f1d0d24018cd4b85c37e5239e4490b8cd44d302bffd63edc1d84","generation":1,"parent":"f17413e08d5f2a8da59d4e8694c9139a9263d82169b39edcae086c6f7193b9fa","status":"healthy","strategy":"univ4_lp","wallet":"0x1f6B969CcbfD351c826401daaC88a8C2F87cf01e","balance":"1000000000000000","position":null,"lastHeartbeatAt":1777379287338,"inheritedScars":["scar_process_killed_1777377166658"],"bornAt":1777377169146,"deathCause":null},{"id":"3843ba88a97ab8ebbcbc74b0c47ea4a71049bdb6455fece5fe5735114f240adc","generation":1,"parent":"182cc7e7707917984d1bde90bd1b6ad1f22134877ac9d45b9dba7643c6837ba7","status":"healthy","strategy":"aave_deposit","wallet":"0xdE2ec8c85c5925d2893c1dBc53168bD1638a947F","balance":"1000000000000000","position":null,"lastHeartbeatAt":1777380607511,"inheritedScars":["scar_process_killed_1777377166658","scar_wallet_drained_1777380325923"],"bornAt":1777380328481,"deathCause":null},{"id":"a7d09de72b74cdac23329fc0f577e3548c1922ff705a196e6473a4b97267f732","generation":1,"parent":"f17413e08d5f2a8da59d4e8694c9139a9263d82169b39edcae086c6f7193b9fa","status":"healthy","strategy":"univ4_lp","wallet":"0xbeDf5b604AeF1793fb343018dC9C7c98CE1FbDfc","balance":"1000000000000000","position":null,"lastHeartbeatAt":1777379287526,"inheritedScars":["scar_process_killed_1777377166658"],"bornAt":1777377169372,"deathCause":null},{"id":"092200e4b60ffa8e030bfec4e12c5d23c061ef1c2332820c42c891dadef1eafc","generation":1,"parent":"182cc7e7707917984d1bde90bd1b6ad1f22134877ac9d45b9dba7643c68