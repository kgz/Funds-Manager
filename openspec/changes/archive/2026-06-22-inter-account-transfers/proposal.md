## Why

Transfers between the user's own accounts appear as spending on one side and income on the other, inflating dashboard KPIs, breakdown, and recurring detection. With multiple linked financial accounts (#13), this is now a common false signal.

## What Changes

- Detect likely transfer pairs across accounts (matching amount, date window, description hints)
- Store confirmed/suggested/dismissed pairs in the database
- Exclude **confirmed** pairs from spending/income aggregates
- API to list suggestions, confirm, dismiss, and manually link two transactions
- Transactions UI: transfer badge, suggestions panel, bulk mark-as-transfer

## Capabilities

### New Capabilities

- `account-transfers`: detection, pairing, and exclusion rules for inter-account movements

### Modified Capabilities

- `api`: new transfer endpoints
- `frontend`: transactions page transfer UX
- `transactions`: list items expose transfer pair metadata

## Impact

- `database/`: migration, `account_transfer` model, analytics query filters
- `app/`: transfer API routes
- `frontend/`: `/transactions` suggestions and badges
