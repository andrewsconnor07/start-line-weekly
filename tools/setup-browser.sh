#!/usr/bin/env bash
# One-time setup so tools/fetch.js can load Cloudflare-protected sites
# (USTFCCCA, Athletic.net, RunnerSpace/DyeStat) in headless Chromium.
# Safe to run more than once.
set -euo pipefail
cd "$(dirname "$0")"

# 1. Playwright library (the Chromium browser is already installed at /opt/pw-browsers).
if [ ! -d node_modules/playwright-core ]; then
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-save --no-audit --no-fund --silent playwright-core@1.63.0
fi

# 2. Let Chromium trust the environment's network proxy certificate
#    (the system already trusts it; Chromium keeps its own store in ~/.pki/nssdb).
CA=/root/.ccr/agent-proxy-ca.crt
DB="sql:$HOME/.pki/nssdb"
if [ -f "$CA" ]; then
  mkdir -p "$HOME/.pki/nssdb"
  [ -f "$HOME/.pki/nssdb/cert9.db" ] || certutil -N -d "$DB" --empty-password
  certutil -D -d "$DB" -n "start-line-weekly proxy CA" 2>/dev/null || true
  certutil -A -d "$DB" -n "start-line-weekly proxy CA" -t "C,," -i "$CA"
fi
echo "browser ready"
