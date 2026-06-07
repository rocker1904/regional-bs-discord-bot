#!/usr/bin/env bash
set -euo pipefail

# Print a labelled header so each step's output is easy to place.
section() { printf '\n==> %s\n' "$*"; }

cd /srv/regional-bs-discord-bot

section "Updating source (git)"
git fetch --prune
git checkout main
git pull --ff-only

section "Installing dependencies (npm ci)"
npm ci

section "Building (npm run build)"
npm run build

section "Running migrations (npm run migrate)"
npm run migrate

section "Restarting service"
# Record the cutoff before restarting so the tail below shows exactly this restart.
since=$(date '+%Y-%m-%d %H:%M:%S')
systemctl restart regional-bs-discord-bot
echo "Deployed $(git rev-parse --short HEAD) at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Wait until the bot reports ready (or the unit dies, or we give up) so the logs below
# never cut off mid-startup. 'Ready! User count' is the last line onReady emits.
echo "Waiting for the bot to report ready..."
for ((i = 0; i < 30; i++)); do
    journalctl -u regional-bs-discord-bot --since "$since" --no-pager | grep -q 'Ready! User count' && break
    systemctl is-active --quiet regional-bs-discord-bot || break
    sleep 1
done

section "Startup logs"
journalctl -u regional-bs-discord-bot --since "$since" --no-pager
