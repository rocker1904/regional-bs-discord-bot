#!/usr/bin/env bash
set -euo pipefail
cd /srv/regional-bs-discord-bot
git fetch --prune
git checkout main
git pull --ff-only
npm ci
npm run build
npm run migrate
systemctl restart regional-bs-discord-bot
echo "Deployed $(git rev-parse --short HEAD) at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
sleep 2
journalctl -u regional-bs-discord-bot -n 15 --no-pager
