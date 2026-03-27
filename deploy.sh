#!/usr/bin/env bash
set -euo pipefail

# ─── Chordsheets Deploy Script ───
# Usage: ./deploy.sh user@host [/opt/chordsheets]
#
# Syncs the project to the VPS and starts containers.
# Requires: rsync, ssh, docker + docker compose on the VPS.

HOST="${1:?Usage: ./deploy.sh user@host [remote-path]}"
REMOTE_DIR="${2:-/opt/chordsheets}"

echo "==> Syncing files to $HOST:$REMOTE_DIR"
rsync -avz --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude .angular \
  --exclude dist \
  --exclude '*.js.map' \
  --exclude .env.production \
  ./ "$HOST:$REMOTE_DIR/"

echo "==> Building and starting containers"
ssh "$HOST" "cd $REMOTE_DIR && docker compose --env-file .env.production up --build -d"

echo "==> Running database migrations"
ssh "$HOST" "cd $REMOTE_DIR && docker compose --env-file .env.production exec server npx node-pg-migrate up --migration-file-language sql --migrations-dir server/src/db/migrations"

echo "==> Done! App is running on $HOST"
docker_ps_output=$(ssh "$HOST" "cd $REMOTE_DIR && docker compose --env-file .env.production ps --format 'table {{.Name}}\t{{.Status}}\t{{.Ports}}'")
echo "$docker_ps_output"
