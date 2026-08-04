#!/usr/bin/env bash
# Fails if raw Tailwind money colours appear outside alert/error UI.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PATTERN='text-(green|red|emerald)-[0-9]'

matches="$(rg -n "$PATTERN" "$ROOT/src" \
  --glob '!**/InlineAlert.tsx' \
  --glob '!**/ErrorState.tsx' \
  || true)"

if [[ -n "$matches" ]]; then
  echo "Found non-semantic money colours (use @/lib/utils/moneySemantics instead):"
  echo "$matches"
  exit 1
fi

echo "Money colour check passed."
