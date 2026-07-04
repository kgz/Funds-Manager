## Context

Income (#110), liabilities (#108), and lender living expenses (#112) each expose monthly figures. #111 composes them into surplus and stress-tested surplus for broker use. Offset/loan-interest modelling remains out of scope (#107).

## Goals / Non-Goals

**Goals:**

- `surplus = income − repayments − living_expenses` (all monthly, same date range)
- Stress buffer on **variable** liabilities only (default +300 bps)
- Committed vs discretionary split from lender buckets
- Optional `account_id` filter (consistent with income/lender APIs)
- JSON shape consumable by #117 report generator

**Non-Goals:**

- PDF / shareable report (#117)
- Point-in-time snapshots (#114)
- User-persisted buffer setting (v1: query param only)
- Full amortisation / offset recalculation

## Decisions

### 1. Income input

Use sum of **confirmed** income streams' `estimated_monthly_dollars`. If none confirmed, fall back to all non-merged streams and set `income_uses_unconfirmed: true` in the response.

Prefer `gross_monthly_dollars` when set on a stream profile.

### 2. Repayments input

Active liabilities (`deleted_at` null) with `repayment_cents` set. Normalise to monthly:

| frequency | formula |
|-----------|---------|
| weekly | `repayment × 52 / 12` |
| fortnightly | `repayment × 26 / 12` |
| monthly | `repayment` |

Liabilities without repayment are listed with `included: false` and excluded from totals.

### 3. Stress test

Query param `rate_buffer_bps` (default `300`). For `rate_type = variable`:

- If `interest_rate_bps` present: `stressed_repayment = base × (rate + buffer) / rate`
- Else: `stressed_repayment = base × (10000 + buffer) / 10000`

Fixed-rate and unknown-rate liabilities keep baseline repayment.

### 4. Living expenses input

`lender_expense::expense_summary(start, end, account_id)` → `total_monthly_dollars` (buckets + unmapped; excludes debt categories in `excluded`).

### 5. Committed vs discretionary

**Committed living buckets:** housing, utilities, insurance, childcare_education, healthcare.

**Discretionary living buckets:** groceries, transport, recreation, clothing_personal, other, plus unmapped.

Liability repayments are always **committed** (shown separately from living split).

### 6. API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/serviceability/summary` | Full breakdown |

Query: `start_date`, `end_date`, optional `account_id`, optional `rate_buffer_bps` (default 300), optional `min_occurrences` for income (default 3).

### 7. Frontend

- Route `/serviceability`, nav **Serviceability** under Cash flow (after Living expenses)
- Period filter (default last 6 months), account filter
- Stat cards: income, repayments, living expenses, surplus; stressed surplus
- Breakdown tables: income streams used, liabilities, bucket split committed/discretionary
