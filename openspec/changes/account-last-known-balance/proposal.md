## Why

The Accounts page lists names and statement counts but not how much each account last held. Users must open Statements or filter the dashboard to see per-account balances.

## What Changes

- Extend `GET /api/accounts?with_stats=true` with `lastKnownBalance` (dollars) and `lastKnownBalanceDate` (ISO date) per account
- Show **Last balance** and **As at** columns on `/accounts`
- Null when the account has no imported transaction history

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `api`: accounts list with stats includes last known balance fields
- `frontend`: accounts table displays last balance and date

## Impact

- `database/src/models/financial_account.rs` — query latest transaction balance per account
- `app/src/routes/accounts.rs` — response shape
- `frontend/src/pages/accounts.tsx`, `frontend/src/types/account.ts`
