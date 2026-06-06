#!/usr/bin/env bash
# Quick API timing smoke test for #22 scale checks.
# Usage: BASE_URL=https://127.0.0.1:2020 ./bin/benchmark-api.sh
set -euo pipefail

BASE_URL="${BASE_URL:-https://127.0.0.1:2020}"
CURL=(curl -sk -o /dev/null -w "%{time_total}\t%{http_code}\t%{url_effective}\n" --max-time 30)

endpoints=(
	"/api/transactions?page=1&per_page=50"
	"/api/statements?page=1&per_page=50"
	"/api/statements/missing-periods"
	"/api/analytics/dashboard"
	"/api/analytics/breakdown?start=2024-01-01&end=2026-12-31"
	"/api/analytics/recurring?min_occurrences=3"
)

echo -e "seconds\thttp\tendpoint"
for path in "${endpoints[@]}"; do
	"${CURL[@]}" "${BASE_URL}${path}"
done
