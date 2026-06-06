# MySQL → PostgreSQL

## Overview

1. **Postgres schema** — `sql/postgres/schema.sql` (ported from Diesel MySQL migrations)
2. **Data copy** — `../bin/migrate-mysql-to-postgres.sh` (table-by-table `COPY`)
3. **App switch** — point `DATABASE_URL` at Postgres + Diesel `postgres` feature (follow-up PR)

## Quick start

```bash
cd database
docker compose up -d db postgres

# MySQL must already have your data (existing ./mysql volume)
export MYSQL_URL=mysql://root@127.0.0.1:3308/funds
export POSTGRES_URL=postgres://funds:funds@127.0.0.1:5434/funds

../bin/migrate-mysql-to-postgres.sh
```

`--schema-only` — reset Postgres tables, apply schema, no data  
`--data-only` — copy data into existing Postgres schema (after manual schema apply)

## What gets copied

| Table | Notes |
|-------|--------|
| `categories` | Preserves ids + parent links |
| `category_mappings` | MySQL `ENUM` → Postgres `category_mappings_match_type` |
| `statement` | |
| `transaction_data` | Largest table |
| `transaction_categories` | Legacy join table if populated |

Sequences are reset after import so new inserts get correct ids.

## Manual alternative

```bash
# Export one table to TSV from MySQL
mysql -h127.0.0.1 -P3308 -uroot funds -B -N -e "SELECT * FROM categories" > /tmp/categories.tsv

# Or full logical dump (needs editing for Postgres syntax)
mysqldump -h127.0.0.1 -P3308 -uroot funds --no-create-info --complete-insert > /tmp/funds-mysql.sql
# Not directly loadable into Postgres — use the bin script instead.
```

## After data migration

- [x] Switch `database` + `app` Diesel to `postgres` backend
- [x] Update `DATABASE_URL` in `.env` files
- [ ] Run app against Postgres; retire MySQL when confident
