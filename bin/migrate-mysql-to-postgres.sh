#!/usr/bin/env bash
# Copy Funds Manager data from MySQL to PostgreSQL (table-by-table).
# Requires: mysql client, psql, both databases reachable.
#
# Usage:
#   ./bin/migrate-mysql-to-postgres.sh           # schema + copy
#   ./bin/migrate-mysql-to-postgres.sh --schema-only
#   ./bin/migrate-mysql-to-postgres.sh --data-only
#
# Env (defaults match database/docker-compose.yml):
#   MYSQL_URL=mysql://root@127.0.0.1:3308/funds
#   POSTGRES_URL=postgres://funds:funds@127.0.0.1:5434/funds
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCHEMA="$ROOT/database/sql/postgres/schema.sql"

MYSQL_URL="${MYSQL_URL:-mysql://root@127.0.0.1:3308/funds}"
POSTGRES_URL="${POSTGRES_URL:-postgres://funds:funds@127.0.0.1:5434/funds}"

SCHEMA_ONLY=false
DATA_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --schema-only) SCHEMA_ONLY=true ;;
    --data-only) DATA_ONLY=true ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

parse_mysql_url() {
  # mysql://[user[:pass]@]host[:port]/db
  local url="${1#mysql://}"
  local userpass="${url%%@*}"
  local hostdb="${url#*@}"
  if [[ "$userpass" == "$url" ]]; then
    MYSQL_USER="root"
    MYSQL_PASS=""
    hostdb="$url"
  else
    MYSQL_USER="${userpass%%:*}"
    MYSQL_PASS="${userpass#*:}"
    if [[ "$MYSQL_PASS" == "$userpass" ]]; then
      MYSQL_PASS=""
    fi
  fi
  local hostport="${hostdb%%/*}"
  MYSQL_DB="${hostdb#*/}"
  MYSQL_HOST="${hostport%%:*}"
  MYSQL_PORT="${hostport#*:}"
  if [[ "$MYSQL_PORT" == "$hostport" ]]; then
    MYSQL_PORT="3306"
  fi
}

mysql_cmd() {
  local args=(-h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" "$MYSQL_DB" -N -B)
  if [[ -n "$MYSQL_PASS" ]]; then
    args+=(-p"$MYSQL_PASS")
  fi
  mysql "${args[@]}" "$@"
}

copy_data() {
  python3 "$ROOT/bin/migrate-mysql-to-postgres.py"
}

parse_mysql_url "$MYSQL_URL"

if ! command -v mysql >/dev/null 2>&1; then
  echo "mysql client not found" >&2
  exit 1
fi
if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found" >&2
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 not found" >&2
  exit 1
fi

if ! mysql_cmd -e "SELECT 1" >/dev/null 2>&1; then
  echo "Cannot reach MySQL at $MYSQL_HOST:$MYSQL_PORT/$MYSQL_DB" >&2
  echo "Start it: cd database && docker compose up -d db" >&2
  exit 1
fi
if ! psql "$POSTGRES_URL" -c "SELECT 1" >/dev/null 2>&1; then
  echo "Cannot reach Postgres at $POSTGRES_URL" >&2
  echo "Start it: cd database && docker compose up -d postgres" >&2
  exit 1
fi

if [[ "$DATA_ONLY" == false ]]; then
  echo "Applying Postgres schema (drops existing public tables)..."
  psql "$POSTGRES_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
DROP TABLE IF EXISTS transaction_categories CASCADE;
DROP TABLE IF EXISTS transaction_data CASCADE;
DROP TABLE IF EXISTS statement CASCADE;
DROP TABLE IF EXISTS category_mappings CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS __diesel_schema_migrations CASCADE;
DROP TYPE IF EXISTS category_mappings_match_type CASCADE;
SQL
  psql "$POSTGRES_URL" -v ON_ERROR_STOP=1 -f "$SCHEMA"
  echo "Schema applied."
fi

if [[ "$SCHEMA_ONLY" == true ]]; then
  exit 0
fi

export MYSQL_URL POSTGRES_URL
copy_data

echo ""
echo "Migration complete. Verify row counts:"
mysql_cmd -e "
SELECT 'categories' AS tbl, COUNT(*) AS n FROM categories
UNION ALL SELECT 'category_mappings', COUNT(*) FROM category_mappings
UNION ALL SELECT 'statement', COUNT(*) FROM statement
UNION ALL SELECT 'transaction_data', COUNT(*) FROM transaction_data
UNION ALL SELECT 'transaction_categories', COUNT(*) FROM transaction_categories;
"
psql "$POSTGRES_URL" -c "
SELECT 'categories' AS tbl, COUNT(*)::text AS n FROM categories
UNION ALL SELECT 'category_mappings', COUNT(*)::text FROM category_mappings
UNION ALL SELECT 'statement', COUNT(*)::text FROM statement
UNION ALL SELECT 'transaction_data', COUNT(*)::text FROM transaction_data
UNION ALL SELECT 'transaction_categories', COUNT(*)::text FROM transaction_categories;
"
