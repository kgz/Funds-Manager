#!/usr/bin/env bash
# Build the Docker image, excluding local database data dirs (permission issues).
# Usage: ./bin/docker-build.sh [tag]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAG="${1:-ghcr.io/kgz/funds-manager:local}"
CTX="$(mktemp -d)"

cleanup() {
	rm -rf "$CTX"
}
trap cleanup EXIT

rsync -a \
	--exclude '.git' \
	--exclude '**/target' \
	--exclude '**/node_modules' \
	--exclude 'app/mysql' \
	--exclude 'database/mysql' \
	--exclude 'database/postgres' \
	--exclude 'backups' \
	--exclude 'certs' \
	--exclude '*.pdf' \
	"$ROOT/" "$CTX/"

docker build -t "$TAG" "$CTX"
echo "Built $TAG"
