#!/usr/bin/env bash
# First-time local development setup.
# Usage: ./bin/dev-setup.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CERT_DIR="${ROOT}/certs"
CERT_FILE="${CERT_DIR}/localhost.pem"
KEY_FILE="${CERT_DIR}/localhost-key.pem"
COMPOSE_FILE="${ROOT}/database/docker-compose.yml"

need() {
	if ! command -v "$1" >/dev/null 2>&1; then
		echo "Missing required command: $1" >&2
		exit 1
	fi
}

echo "==> Checking prerequisites"
need docker
need cargo
need pnpm
need mkcert

echo "==> Starting PostgreSQL (docker compose)"
docker compose -f "$COMPOSE_FILE" up -d postgres

echo "==> Waiting for PostgreSQL"
for _ in $(seq 1 30); do
	if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U funds -d funds >/dev/null 2>&1; then
		break
	fi
	sleep 1
done
if ! docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U funds -d funds >/dev/null 2>&1; then
	echo "PostgreSQL did not become ready in time" >&2
	exit 1
fi

if [[ ! -f "$CERT_FILE" || ! -f "$KEY_FILE" ]]; then
	echo "==> Generating local TLS certificates (mkcert)"
	mkdir -p "$CERT_DIR"
	mkcert -install 2>/dev/null || true
	mkcert -key-file "$KEY_FILE" -cert-file "$CERT_FILE" localhost 127.0.0.1 ::1
fi

copy_env() {
	local src="$1"
	local dest="$2"
	if [[ -f "$dest" ]]; then
		echo "    keep existing $(basename "$dest")"
		return
	fi
	cp "$src" "$dest"
	echo "    created $(basename "$dest") from skeleton"
}

echo "==> Creating .env files (skipped if already present)"
copy_env "${ROOT}/app/.env.skeleton" "${ROOT}/app/.env"
copy_env "${ROOT}/database/.env.skeleton" "${ROOT}/database/.env"
copy_env "${ROOT}/frontend/.env.example" "${ROOT}/frontend/.env"

echo "==> Installing frontend dependencies"
(cd "${ROOT}/frontend" && pnpm install)

cat <<EOF

Setup complete.

Terminal 1 — backend (from app/):
  cd app && cargo run

Terminal 2 — frontend:
  cd frontend && pnpm dev

Open the app:
  http://localhost:3000

Notes:
  - Backend API: https://127.0.0.1:2020 (debug build uses HTTPS + mkcert certs in certs/)
  - Vite proxies /api to the backend
  - On WSL + Windows Chrome, frontend/.env sets VITE_DEV_HTTP=true (use http:// not https://)
  - Migrations run automatically when the backend starts

More detail: docs/local-development.md
EOF
