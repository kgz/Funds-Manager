## Why

Statements store a raw `account_id` string from the PDF parser with no bank label or user-friendly name. Users with multiple accounts (or banks) cannot filter the dashboard, transactions, or breakdown to one account, or compare spending across banks.

## What Changes

- `financial_accounts` table: bank name, display name, account number (parser id), parser key, optional account type
- Link `statement` rows to `financial_account_id`
- Auto-provision account on first import for a parser + account number pair (editable display name later)
- CRUD API for accounts
- Filter transactions and statements by account
- Dashboard and breakdown account selector (single account or all)
- Accounts management UI

## Capabilities

### New Capabilities

- `financial-accounts`: bank/account registry and statement linkage

### Modified Capabilities

- `statements`: FK to financial account; list filter by account
- `transactions`: expose account context; list filter by account
- `frontend`: account filter controls and `/accounts` management page
- `api`: accounts endpoints and query params on list routes

## Impact

- `database/migrations/` — `financial_accounts` table, `statement.financial_account_id`
- `database/src/models/`, `schema.rs`
- `app/src/routes/` — accounts API; extend statement import to resolve/create account
- `frontend/src/pages/accounts.tsx` (new)
- `frontend/src/components/dashboard.tsx`, `breakdown`, `transactions.tsx`, `statements.tsx`

## Non-Goals

- Open banking / live API feeds (PDF import only)
- Multi-currency per account
- Merging duplicate accounts automatically (manual rename/link later)
