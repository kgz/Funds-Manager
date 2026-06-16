#!/usr/bin/env bash
# Create a Docker build context (excludes local DB data, target/, etc.).
# Usage: CTX=$(./bin/docker-context.sh)   # caller removes $CTX when done
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CTX="$(mktemp -d)"

rsync -a \
	--exclude '.git' \
	--exclude '**/target' \
	--exclude '**/node_modules' \
	--exclude 'app/mysql' \
	--exclude 'database/mysql' \
	--exclude 'database/postgres' \
	--exclude 'backups' \
	--exclude 'certs' \
	--exclude 'dist' \
	--exclude '*.pdf' \
	"$ROOT/" "$CTX/"

printf '%s' "$CTX"
