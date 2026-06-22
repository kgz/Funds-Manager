## Context

Breakdown and dashboard aggregate by app category. Brokers expect HEM-style living expense lines. Users keep their own category tree; this change adds a mapping layer and rolled-up summary without changing categories.

## Goals / Non-Goals

**Goals:**

- Seed canonical lender buckets in Postgres
- Default map categories by name heuristics; user overrides in `category_lender_mappings`
- `GET /api/lender-expenses/summary` with monthly averages for a date range
- `/lender-expenses` page: period filter, bucket table, edit mappings modal

**Non-Goals:**

- PDF report output (#117)
- One-off exclusion via annotations (#115) — v1 uses all categorised debits
- Auto-map from merchants (#42)

## Decisions

### 1. Schema

```sql
lender_expense_buckets (bucket_key PK, label, sort_order)
category_lender_mappings (category_id PK FK categories, bucket_key FK buckets, updated_at)
```

Buckets seeded in migration. Overrides only stored when user changes a mapping.

### 2. Default resolution

Rust helper `default_bucket_for_category(name)` returns `Option<bucket_key>`. Income-like names return `None` (excluded). Unmapped debits roll into an `unmapped` summary row.

### 3. Summary maths

- Debits only (`amount < 0`), active statements, optional account filter
- `monthly_average = total_dollars / months_in_range` (calendar months inclusive)
- All buckets returned (zero if no spend)

### 4. API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/lender-expenses/buckets` | Canonical buckets |
| GET | `/api/lender-expenses/mappings` | Categories with resolved bucket |
| PUT | `/api/lender-expenses/mappings` | Upsert override |
| GET | `/api/lender-expenses/summary` | Bucket totals + monthly averages |

Query params for summary: `start_date`, `end_date`, optional `account_id`.

### 5. Frontend

- Route `/lender-expenses`, nav **Living expenses** under Cash flow
- Reuse `PeriodFilter` + `periodDateRange` (default last 6 months)
- Table: bucket label, total, monthly avg, txn count
- Mappings modal: category → bucket select
