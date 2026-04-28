#!/usr/bin/env bash
# screenshot-dashboard.sh — capture a headless PNG of the live dashboard
# for inclusion as a per-attack evidence artifact under docs/attacks/.
#
# Usage:
#   ./demo/screenshot-dashboard.sh <attack-number>
# e.g.
#   ./demo/screenshot-dashboard.sh 02
#
# Writes to: docs/attacks/attack-${n}-dashboard.png
#
# Why this is non-trivial:
#   - chromium's bare --screenshot fires before the SSE stream delivers
#     the first snapshot, so the PNG captures the "connecting to swarm…"
#     loading state. We use playwright's waitForSelector against the
#     "Heads alive" stat label to ensure the snapshot has rendered.
#   - playwright is installed under /tmp/pw-install (devDep on the
#     server only — not in the repo's package.json) so the install
#     cost is borne once on first run.

set -euo pipefail

ATTACK_NUM="${1:?usage: $0 <attack-number>  (e.g. 02)}"
OUT="docs/attacks/attack-${ATTACK_NUM}-dashboard.png"
URL="${HYDRA_DASHBOARD_URL:-http://127.0.0.1:3000/dashboard}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

mkdir -p docs/attacks

# Install playwright on demand (idempotent)
if [ ! -d /tmp/pw-install/node_modules/playwright ]; then
  echo "→ installing playwright (one-time)"
  npm install --no-save --prefix /tmp/pw-install playwright >/dev/null
fi

# Ensure browser binaries are present
if [ ! -d /root/.cache/ms-playwright/chromium-1217 ] \
   && [ ! -d "$HOME/.cache/ms-playwright/chromium-1217" ]; then
  echo "→ downloading chromium (one-time)"
  npx --yes playwright@latest install --with-deps chromium >/dev/null
fi

cat > /tmp/_hydra-screenshot.js <<'JS'
const path = process.env.OUT_PATH;
const url = process.env.URL;
const { chromium } = require("/tmp/pw-install/node_modules/playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  // The dashboard renders "connecting to swarm…" until the SSE stream
  // delivers the first snapshot. The "Heads alive" stat label only
  // appears once the snapshot is in state.
  await page.waitForSelector("text=Heads alive", { timeout: 15000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path, fullPage: false });
  await browser.close();
  console.log("✓ wrote " + path);
})().catch((e) => {
  console.error("ERR: " + e.message);
  process.exit(1);
});
JS

OUT_PATH="$REPO_ROOT/$OUT" URL="$URL" node /tmp/_hydra-screenshot.js
ls -la "$OUT"
