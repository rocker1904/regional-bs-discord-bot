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

section "Startup logs"
# Stream this restart's logs live and stop just after the bot reports ready. The --since
# backlog includes the shutdown lines, then journalctl follows. 'Ready! User count' is the
# last line onReady emits; {N;q} also grabs the one line after it (the ScoreSaber WSS connect).
# timeout guards a crash/hang; the reader quitting SIGPIPEs journalctl, hence '|| true'.
timeout 30 journalctl -u regional-bs-discord-bot --since "$since" -f \
    | stdbuf -oL sed '/Ready! User count/{N;q}' || true
