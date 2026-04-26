#!/usr/bin/env bash
# kill.sh — kill a HYDRA head process and optionally inject a death cause
#
# Usage:
#   ./demo/kill.sh <head-index> [--cause <cause>]
#
# Causes: key_revoked | process_killed | api_timeout | wallet_drained
#
# Behavior:
#   1. Broadcast a `panic` from the dying head to its surviving peers (so
#      consensus can attribute the cause when its heartbeat times out).
#   2. Send SIGTERM to the head Node process via PID file.
#   3. Wait briefly so the diagnostics SIGTERM handler can flush.
#   4. Hard-kill if still running.
#
set -euo pipefail

HEAD_INDEX="${1:-}"
CAUSE="process_killed"

if [ -z "$HEAD_INDEX" ]; then
  echo "Usage: $0 <head-index> [--cause <cause>]" >&2
  exit 1
fi
shift

while [[ $# -gt 0 ]]; do
  case "$1" in
    --cause) CAUSE="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 1 ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

HEAD_API_PORT=$((9002 + (HEAD_INDEX - 1) * 10))
PID_FILE="logs/head-${HEAD_INDEX}.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "no PID file at $PID_FILE — is head-$HEAD_INDEX running?" >&2
  exit 1
fi
HEAD_PID=$(cat "$PID_FILE")

echo "→ killing head-$HEAD_INDEX (pid=$HEAD_PID) cause=$CAUSE"

# Step 1: get this head's peer-id from its AXL node
HEAD_PEERID=$(curl -s --max-time 2 "http://127.0.0.1:$HEAD_API_PORT/topology" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['our_public_key'])" 2>/dev/null || echo "")

if [ -z "$HEAD_PEERID" ]; then
  echo "  warn: could not fetch head-$HEAD_INDEX peer-id (AXL node down?), skipping panic broadcast"
else
  # Step 2: broadcast panic to all OTHER live heads
  for i in 1 2 3 4 5; do
    if [ "$i" = "$HEAD_INDEX" ]; then continue; fi
    PEER_PORT=$((9002 + (i - 1) * 10))
    PEER_PEERID=$(curl -s --max-time 1 "http://127.0.0.1:$PEER_PORT/topology" 2>/dev/null \
      | python3 -c "import sys,json; print(json.load(sys.stdin)['our_public_key'])" 2>/dev/null || echo "")
    if [ -z "$PEER_PEERID" ]; then continue; fi

    TS=$(($(date +%s) * 1000))
    curl -s --max-time 1 -X POST "http://127.0.0.1:$HEAD_API_PORT/send" \
      -H "X-Destination-Peer-Id: $PEER_PEERID" \
      -H "Content-Type: application/json" \
      -d "{\"type\":\"panic\",\"from\":\"$HEAD_PEERID\",\"reason\":\"$CAUSE\",\"ts\":$TS}" \
      -o /dev/null && echo "  panic → head-$i"
  done
fi

sleep 0.3

# Step 3: SIGTERM the Node head process (diagnostics handler also sends panic)
echo "→ SIGTERM head-$HEAD_INDEX pid=$HEAD_PID"
kill -TERM "$HEAD_PID" 2>/dev/null || true
sleep 0.5

# Step 4: confirm dead, hard-kill if needed
if kill -0 "$HEAD_PID" 2>/dev/null; then
  echo "  still alive, SIGKILL"
  kill -KILL "$HEAD_PID" 2>/dev/null || true
fi

# Optionally also stop the AXL node sidecar (so /recv doesn't keep returning)
AXL_PID=$(pgrep -f "configs/h${HEAD_INDEX}.json" || echo "")
if [ -n "$AXL_PID" ]; then
  echo "→ stopping AXL sidecar pid=$AXL_PID"
  kill -TERM "$AXL_PID" 2>/dev/null || true
fi

rm -f "$PID_FILE"
echo "✓ head-$HEAD_INDEX killed"
