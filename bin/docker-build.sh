#!/usr/bin/env bash
# Build the Docker image, excluding local database data dirs (permission issues).
# Usage: ./bin/docker-build.sh [tag]
set -euo pipefail

TAG="${1:-ghcr.io/kgz/funds-manager:local}"
CTX="$(./bin/docker-context.sh)"
trap 'rm -rf "$CTX"' EXIT

docker build -t "$TAG" "$CTX"
echo "Built $TAG"
