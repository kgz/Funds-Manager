#!/usr/bin/env bash
# Quick API timing smoke test for #22 scale checks.
# Usage: BASE_URL=https://127.0.0.1:2020 RUNS=3 ./bin/benchmark-api.sh
set -euo pipefail

BASE_URL="${BASE_URL:-https://127.0.0.1:2020}"
RUNS="${RUNS:-1}"

endpoints=(
	"/api/transactions?page=1&per_page=50"
	"/api/statements?page=1&per_page=50"
	"/api/statements/missing-periods"
	"/api/analytics/dashboard"
	"/api/analytics/breakdown?start=2024-01-01&end=2026-12-31"
	"/api/analytics/recurring?min_occurrences=3"
)

echo "BASE_URL=${BASE_URL} RUNS=${RUNS}"

python3 - "$BASE_URL" "$RUNS" "${endpoints[@]}" <<'PY'
import subprocess
import sys

base = sys.argv[1]
runs = int(sys.argv[2])
paths = sys.argv[3:]

print("endpoint\tavg_s\thttp")
for path in paths:
    times = []
    code = "000"
    url = base + path
    for _ in range(runs):
        proc = subprocess.run(
            ["curl", "-sk", "-o", "/dev/null", "-w", "%{time_total} %{http_code}", "--max-time", "30", url],
            capture_output=True,
            text=True,
            check=True,
        )
        parts = proc.stdout.strip().split()
        times.append(float(parts[0]))
        code = parts[1]
    avg = sum(times) / len(times)
    print(f"{path}\t{avg:.3f}\t{code}")
PY
