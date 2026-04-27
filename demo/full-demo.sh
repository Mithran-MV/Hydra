#!/usr/bin/env bash
# full-demo.sh — end-to-end HYDRA demo run
#
# Boots 3 AXL Go nodes + 3 head Node procs + (optionally) the web dev server,
# then waits for steady-state heartbeats, then kills head-2 with a chosen
# cause to trigger the full consensus → resurrection → on-chain → KH cycle.
#
# Usage:
#   ./demo/full-demo.sh [--cause <cause>] [--no-web] [--no-attack]
#
# Env vars consumed:
#   OG_STORAGE_LIVE=1   upload scars to live 0G Storage
#   OG_COMPUTE_LIVE=1   children call 0G Compute on boot
#
set -euo pipefail

CAUSE="key_revoked"
START_WEB=1
ATTACK=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --cause) CAUSE="$2"; shift 2 ;;
    --no-web) START_WEB=0; shift ;;
    --no-attack) ATTACK=0; shift ;;
    *) echo "unknown arg: $1" >&2; exit 1 ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

step() { echo; echo "═══ $* ═══"; }

step "1. clean slate (reset.sh --hard)"
./demo/reset.sh --hard

step "2. start AXL Go nodes (ports 9001/9011/9021)"
nohup ./axl/bin/axl-node -config configs/h1.json > logs/axl-1.log 2>&1 &
sleep 1
nohup ./axl/bin/axl-node -config configs/h2.json > logs/axl-2.log 2>&1 &
nohup ./axl/bin/axl-node -config configs/h3.json > logs/axl-3.log 2>&1 &
sleep 3
for p in 9002 9012 9022; do
  if curl -s -m 2 "http://127.0.0.1:$p/topology" > /dev/null 2>&1; then
    echo "  ✓ axl :$p ready"
  else
    echo "  ✗ axl :$p NOT ready"; exit 1
  fi
done

step "3. start 3 head Node procs (with 0G Storage + Compute live if set)"
ACTIVE_HEADS=3 \
  OG_STORAGE_LIVE="${OG_STORAGE_LIVE:-1}" \
  OG_COMPUTE_LIVE="${OG_COMPUTE_LIVE:-1}" \
  HEAD_INDEX=1 HEAD_STRATEGY=aave_deposit \
  nohup npx tsx agents/src/head.ts > logs/head-1.log 2>&1 &
sleep 1
ACTIVE_HEADS=3 \
  OG_STORAGE_LIVE="${OG_STORAGE_LIVE:-1}" \
  OG_COMPUTE_LIVE="${OG_COMPUTE_LIVE:-1}" \
  HEAD_INDEX=2 HEAD_STRATEGY=univ4_lp \
  nohup npx tsx agents/src/head.ts > logs/head-2.log 2>&1 &
ACTIVE_HEADS=3 \
  OG_STORAGE_LIVE="${OG_STORAGE_LIVE:-1}" \
  OG_COMPUTE_LIVE="${OG_COMPUTE_LIVE:-1}" \
  HEAD_INDEX=3 HEAD_STRATEGY=payroll \
  nohup npx tsx agents/src/head.ts > logs/head-3.log 2>&1 &

if [ "$START_WEB" -eq 1 ]; then
  step "4. start web dashboard (Next.js dev) on :3000"
  if ! curl -s -m 1 http://localhost:3000 > /dev/null 2>&1; then
    nohup npm run dev --workspace=web > logs/web.log 2>&1 &
    sleep 6
  else
    echo "  ✓ web already running"
  fi
fi

step "5. wait 8s for heartbeats to flow"
sleep 8
HB=$(grep -c heartbeat.sent logs/events.jsonl 2>/dev/null || echo 0)
echo "  $HB heartbeat events emitted"

if [ "$ATTACK" -eq 1 ]; then
  step "6. attack — kill head-2 (cause=$CAUSE)"
  ./demo/kill.sh 2 --cause "$CAUSE"

  step "7. wait 35s for consensus → resurrection → chain tx"
  sleep 35

  step "8. on-chain proofs"
  grep -hE "📜|🎴|🛰️|🧠" logs/head-*.log 2>/dev/null | sed 's/.*\] //' | head -10

  step "9. dashboard snapshot"
  curl -s -m 2 http://localhost:3000/api/events 2>/dev/null | head -1 | python3 -c "
import json, sys
d = sys.stdin.read().strip()
if d.startswith('data:'):
    s = json.loads(d[5:])
    print(f'  generation: {s[\"generation\"]}')
    print(f'  heads alive: {len(s[\"heads\"])}')
    print(f'  scars: {len(s[\"scars\"])}')
    print(f'  attacks survived: {s[\"attacksSurvived\"]}')
    inf = s.get('inference')
    print(f'  inference: {\"verified\" if inf and inf.get(\"verified\") else \"none/unverified\"}')
    kh = s.get('keeperhub')
    print(f'  keeperhub: {kh.get(\"status\") if kh else \"none\"}')
"
fi

step "10. urls"
echo "  dashboard      http://localhost:3000/dashboard"
echo "  0G chainscan   https://chainscan-galileo.0g.ai/address/0x7CDbb447D2a604bceF944e16ab6B9515601c6dB7"
echo
echo "to stop: pkill -f 'axl-node|head\\.ts|next dev'"
