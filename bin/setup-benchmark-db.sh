#!/usr/bin/env bash
# Create an isolated benchmark database (never touches `funds`).
# Usage:
#   ./bin/setup-benchmark-db.sh
#   ./bin/setup-benchmark-db.sh --statements 150 --tx-per-statement 300
#   ./bin/setup-benchmark-db.sh --reset   # drop and recreate funds_bench
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_HOST="${PG_HOST:-127.0.0.1}"
PG_PORT="${PG_PORT:-5434}"
PG_USER="${PG_USER:-funds}"
PG_PASSWORD="${PG_PASSWORD:-funds}"
BENCH_DB="${BENCH_DB:-funds_bench}"
STATEMENTS=120
TX_PER_STATEMENT=250
RESET=false

while [[ $# -gt 0 ]]; do
	case "$1" in
		--reset) RESET=true; shift ;;
		--statements) STATEMENTS="$2"; shift 2 ;;
		--tx-per-statement) TX_PER_STATEMENT="$2"; shift 2 ;;
		--db) BENCH_DB="$2"; shift 2 ;;
		-h|--help)
			echo "Usage: $0 [--reset] [--statements N] [--tx-per-statement N] [--db NAME]"
			exit 0
			;;
		*) echo "Unknown option: $1" >&2; exit 1 ;;
	esac
done

export PGPASSWORD="$PG_PASSWORD"
PSQL=(psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -v ON_ERROR_STOP=1)
BENCH_URL="postgres://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${BENCH_DB}?sslmode=disable"

if [[ "$RESET" == true ]]; then
	echo "Dropping ${BENCH_DB} if it exists..."
	"${PSQL[@]}" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${BENCH_DB}' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
	"${PSQL[@]}" -d postgres -c "DROP DATABASE IF EXISTS ${BENCH_DB};"
fi

exists="$("${PSQL[@]}" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '${BENCH_DB}'")"
if [[ "$exists" == "1" && "$RESET" != true ]]; then
	echo "Database ${BENCH_DB} already exists. Pass --reset to drop and reseed." >&2
	exit 1
fi
if [[ "$exists" != "1" ]]; then
	echo "Creating database ${BENCH_DB}..."
	"${PSQL[@]}" -d postgres -c "CREATE DATABASE ${BENCH_DB};"
fi

echo "Applying schema to ${BENCH_DB}..."
"${PSQL[@]}" -d "$BENCH_DB" -f "${ROOT}/database/sql/postgres/schema.sql" >/dev/null
if [[ -f "${ROOT}/database/migrations/2026-06-06-140000_performance_indexes/up.sql" ]]; then
	"${PSQL[@]}" -d "$BENCH_DB" -f "${ROOT}/database/migrations/2026-06-06-140000_performance_indexes/up.sql" >/dev/null
fi

echo "Seeding ${STATEMENTS} statements × ${TX_PER_STATEMENT} transactions..."
DATABASE_URL="$BENCH_URL" cargo run --quiet --manifest-path "${ROOT}/database/Cargo.toml" --bin benchmark_seed -- \
	--statements "$STATEMENTS" \
	--tx-per-statement "$TX_PER_STATEMENT"

counts="$("${PSQL[@]}" -d "$BENCH_DB" -tAc "SELECT (SELECT COUNT(*) FROM statement WHERE deleted_at IS NULL), (SELECT COUNT(*) FROM transaction_data WHERE deleted_at IS NULL)")"
echo "Benchmark DB ready: ${BENCH_DB}"
echo "  active statements / transactions: ${counts}"
echo ""
echo "Run API against benchmark data:"
echo "  DATABASE_URL=${BENCH_URL} cargo run -C ${ROOT}/app"
echo ""
echo "Then:"
echo "  BASE_URL=https://127.0.0.1:2020 RUNS=3 ${ROOT}/bin/benchmark-api.sh"
