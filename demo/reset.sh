#!/usr/bin/env bash
# reset.sh — wipe runtime state for a clean swarm boot
#
#   ./demo/reset.sh           # stop everything, clear logs, keep contracts
#   ./demo/reset.sh --hard    # also wipe child keys/configs (h4+)
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

HARD=0
[[ "${1:-}" == "--hard" ]] && HARD=1

echo "→ stopping head Node processes"
pkill -f "head\.ts" 2>/dev/null || true

echo "→ stopping AXL Go sidecars"
pkill -f "axl/bin/axl-node" 2>/dev/null || true

# Give them a beat to terminate cleanly
sleep 1

echo "→ clearing logs/events.jsonl"
> logs/events.jsonl 2>/dev/null || true

echo "→ clearing per-head logs"
rm -f logs/head-*.log logs/axl-*.log logs/web.log 2>/dev/null || true

echo "→ clearing PID files"
rm -f logs/head-*.pid 2>/dev/null || true

echo "→ clearing 0G KV mirror"
rm -rf logs/og-kv 2>/dev/null || true
rm -rf logs/og-log 2>/dev/null || true

if [ "$HARD" -eq 1 ]; then
  echo "→ HARD reset: removing child keys (h4+) + dynamic configs"
  for i in 4 5 6 7 8 9 10 11 12 13 14 15; do
    rm -f "keys/h${i}.pem" 2>/dev/null || true
  done
  # Don't remove pre-staged h1-h3 PEMs/configs nor h4/h5 configs (they're tracked)
fi

echo "✓ reset complete"
echo
echo "Next:"
echo "  ./axl/bin/axl-node -config configs/h1.json &"
echo "  ./axl/bin/axl-node -config configs/h2.json &"
echo "  ./axl/bin/axl-node -config configs/h3.json &"
echo "  HEAD_INDEX=1 HEAD_STRATEGY=aave_deposit npx tsx agents/src/head.ts &"
echo "  HEAD_INDEX=2 HEAD_STRATEGY=univ4_lp     npx tsx agents/src/head.ts &"
echo "  HEAD_INDEX=3 HEAD_STRATEGY=payroll      npx tsx agents/src/head.ts &"
