#!/usr/bin/env bash
# Create an isolated demo database for UI/feature exploration (never touches `funds`).
# Usage:
#   ./bin/setup-demo-db.sh
#   ./bin/setup-demo-db.sh --reset
#   ./bin/setup-demo-db.sh --statements 48 --tx-per-statement 150
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_HOST="${PG_HOST:-127.0.0.1}"
PG_PORT="${PG_PORT:-5434}"
PG_USER="${PG_USER:-funds}"
PG_PASSWORD="${PG_PASSWORD:-funds}"
DEMO_DB="${DEMO_DB:-funds_demo}"
STATEMENTS=36
TX_PER_STATEMENT=120
RESET=false

while [[ $# -gt 0 ]]; do
	case "$1" in
		--reset) RESET=true; shift ;;
		--statements) STATEMENTS="$2"; shift 2 ;;
		--tx-per-statement) TX_PER_STATEMENT="$2"; shift 2 ;;
		--db) DEMO_DB="$2"; shift 2 ;;
		-h|--help)
			echo "Usage: $0 [--reset] [--statements N] [--tx-per-statement N] [--db NAME]"
			exit 0
			;;
		*) echo "Unknown option: $1" >&2; exit 1 ;;
	esac
done

export PGPASSWORD="$PG_PASSWORD"
PSQL=(psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -v ON_ERROR_STOP=1)
DEMO_URL="postgres://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${DEMO_DB}?sslmode=disable"

if ! docker compose -f "${ROOT}/database/docker-compose.yml" exec -T postgres pg_isready -U funds -d funds >/dev/null 2>&1; then
	echo "PostgreSQL is not running. Start it with:" >&2
	echo "  docker compose -f database/docker-compose.yml up -d postgres" >&2
	exit 1
fi

if [[ "$RESET" == true ]]; then
	echo "Dropping ${DEMO_DB} if it exists..."
	"${PSQL[@]}" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DEMO_DB}' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
	"${PSQL[@]}" -d postgres -c "DROP DATABASE IF EXISTS ${DEMO_DB};"
fi

exists="$("${PSQL[@]}" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '${DEMO_DB}'")"
if [[ "$exists" == "1" && "$RESET" != true ]]; then
	echo "Database ${DEMO_DB} already exists. Pass --reset to drop and reseed." >&2
	exit 1
fi
if [[ "$exists" != "1" ]]; then
	echo "Creating database ${DEMO_DB}..."
	"${PSQL[@]}" -d postgres -c "CREATE DATABASE ${DEMO_DB};"
fi

echo "Applying migrations to ${DEMO_DB}..."
DATABASE_URL="$DEMO_URL" cargo run --quiet --manifest-path "${ROOT}/database/Cargo.toml" --bin migrate

echo "Seeding demo data (${STATEMENTS} months × ${TX_PER_STATEMENT} tx × 3 accounts + assets, liabilities, predictions)..."
DATABASE_URL="$DEMO_URL" cargo run --quiet --manifest-path "${ROOT}/database/Cargo.toml" --bin demo_seed -- \
	--statements "$STATEMENTS" \
	--tx-per-statement "$TX_PER_STATEMENT"

counts="$("${PSQL[@]}" -d "$DEMO_DB" -tAc "
SELECT
  (SELECT COUNT(*) FROM financial_accounts WHERE deleted_at IS NULL),
  (SELECT COUNT(*) FROM statement WHERE deleted_at IS NULL),
  (SELECT COUNT(*) FROM transaction_data WHERE deleted_at IS NULL),
  (SELECT COUNT(*) FROM assets WHERE deleted_at IS NULL),
  (SELECT COUNT(*) FROM liabilities WHERE deleted_at IS NULL),
  (SELECT COUNT(*) FROM prediction_scenarios WHERE deleted_at IS NULL),
  (SELECT COUNT(*) FROM prediction_goals WHERE deleted_at IS NULL),
  (SELECT COUNT(*) FROM planned_spending WHERE deleted_at IS NULL)
")"
echo "Demo DB ready: ${DEMO_DB}"
echo "  accounts / statements / transactions / assets / liabilities / scenarios / goals / planned: ${counts}"
echo ""
echo "Run the API against demo data:"
echo "  cp app/.env.demo app/.env   # or: DATABASE_URL=${DEMO_URL} cargo run -C ${ROOT}/app"
echo ""
echo "Then start frontend as usual (cd frontend && pnpm dev) and open http://localhost:3000"
