#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PI="${PI:-user@pi-host}"
REMOTE_FUNDS_MEDIA_ROOT="${REMOTE_FUNDS_MEDIA_ROOT:-/srv/funds}"

echo "==> Building frontend (VITE_BASE=/media) -> app/static"
cd "$ROOT/frontend"
VITE_BASE=/media npm run build:embed

echo "==> rsync static files -> $PI:$REMOTE_FUNDS_MEDIA_ROOT/media/"
ssh "$PI" "mkdir -p \"$REMOTE_FUNDS_MEDIA_ROOT/media\""
rsync -avz --delete "$ROOT/app/static/" "$PI:$REMOTE_FUNDS_MEDIA_ROOT/media/"

echo "Done. Nginx: set root to parent of 'media' (see deploy/nginx-snippet.conf)."
echo "API binary: cross-compile then e.g."
echo "  scp $ROOT/app/target/aarch64-unknown-linux-gnu/release/server_v2 $PI:~/funds/server_v2"
echo "  rustup target add aarch64-unknown-linux-gnu && (cd $ROOT/app && cargo build --release --target aarch64-unknown-linux-gnu)"
echo "systemd: deploy/funds-api.service -> ~/.config/systemd/user/ or /etc/systemd/system/ (edit paths)."
