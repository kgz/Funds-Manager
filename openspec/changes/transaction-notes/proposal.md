## Why

Users need free-text context on individual transactions (e.g. "shared dinner", "reimbursable") without changing the bank description or category.

## What Changes

- Add optional `notes` column on `transaction_data`
- `PATCH /api/transactions/{id}/notes` to set or clear notes
- Include `notes` in `GET /api/transactions` responses
- Notes column on `/transactions` page with inline edit (save on blur)
- New transactions from PDF import start with `notes = null`

## Capabilities

### Modified Capabilities

- `transactions`: notes field and API
- `frontend`: notes UI on transactions table
- `api`: new PATCH route

## Impact

- `database/migrations/` — add `notes TEXT NULL`
- `database/src/schema.rs`, `database/src/models/transaction.rs`
- `app/src/routes/transactions_api.rs`
- `frontend/src/store/thunks/transactions.get.all.ts`
- `frontend/src/store/thunks/transaction.patch.notes.ts` (new)
- `frontend/src/pages/transactions.tsx`

## Non-Goals

- Notes on dashboard breakdown sidebar
- Full-text search by notes
- Notes in auto-categorization / learned descriptions
