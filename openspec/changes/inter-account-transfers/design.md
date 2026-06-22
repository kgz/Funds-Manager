## Data model

`account_transfer_pairs`:

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| out_transaction_id | bigint FK → transaction_data | debit (negative amount) |
| in_transaction_id | bigint FK → transaction_data | credit (positive amount) |
| status | varchar | `suggested`, `confirmed`, `dismissed` |
| created_at / updated_at | timestamp | |

Unique on each transaction id (a line can belong to at most one pair).

## Detection (v1)

On demand (`GET /api/transfers/suggestions`):

1. Active, non-deleted transactions on different `financial_account_id` values
2. `out.amount = -in.amount` (exact cents)
3. `|out.date - in.date| <= 3 days`
4. Not already in any pair (any status)
5. Optional keyword boost in response score: `TRANSFER`, `TFR`, `OSKO`, `PAYMENT TO`, `INTERNAL`, `PAY ANYONE`

Auto-detection on PDF import is out of scope for v1 (on-demand scan only).

## Analytics exclusion

Shared SQL fragment: exclude rows where `account_transfer_pairs.status = 'confirmed'` matches either side of the pair.

Applied to dashboard KPIs, monthly summary, category breakdown, recurring input load, lender expense spend totals.

**Suggested** pairs remain in aggregates until confirmed.

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/transfers/suggestions` | Detect + return suggested pairs |
| GET | `/api/transfers` | List confirmed pairs |
| POST | `/api/transfers` | Confirm pair (manual or from suggestion ids) |
| PATCH | `/api/transfers/{id}` | Confirm or dismiss |
| DELETE | `/api/transfers/{id}` | Unlink confirmed pair |

## Frontend

- Banner on `/transactions` when suggestions exist
- Transfer badge on confirmed rows
- Select two transactions → "Mark as transfer"
- Toggle: hide transfers in list (localStorage)
