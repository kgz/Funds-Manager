## Data model

```
financial_accounts
  id              INT PK
  bank_name       VARCHAR   -- e.g. "Heritage", "CommBank"
  display_name    VARCHAR   -- user label, e.g. "Joint savings"
  account_number  VARCHAR   -- parser account_id (e.g. "102049120")
  parser_name     VARCHAR   -- e.g. "heritage"
  account_type    VARCHAR NULL  -- checking | savings | credit (optional)
  created_at, deleted_at

statement
  + financial_account_id INT FK -> financial_accounts.id
  (keep account_id string for parser matching during import)
```

Unique active row per `(parser_name, account_number)` where `deleted_at IS NULL`.

## Import flow

1. PDF parses → `parser_name` + `account_id` (account number)
2. Lookup `financial_accounts` by parser + account number
3. If missing: insert with `bank_name` from parser registry (e.g. heritage → "Heritage"), `display_name` defaulting to `"{bank_name} {last4}"`
4. Set `statement.financial_account_id` on insert

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/accounts` | List active accounts |
| POST | `/api/accounts` | Create account manually |
| PUT | `/api/accounts/{id}` | Update display name, bank name, type |
| DELETE | `/api/accounts/{id}` | Soft-delete (statements remain, account hidden from filters) |

Query params:
- `GET /api/statements?account_id={id}`
- `GET /api/transactions?account_id={id}`

## Frontend

- Global account filter in nav or dashboard header: **All accounts** | per-account
- Persist selection in `localStorage`
- `/accounts` page: table of accounts, edit display name, see statement count
- Statements/transactions tables show account display name column

## Migration

- Backfill `financial_accounts` from distinct `(account_id)` on existing statements (assume `heritage` parser)
- Set `financial_account_id` on all existing statements
