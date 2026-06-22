## Why

Broker and lender expense declarations use standardised living-expense buckets (HEM-style), not the app's internal categories (#107 stage 2, #112).

## What Changes

- Canonical lender expense buckets (groceries, utilities, transport, etc.)
- Map app categories → buckets with sensible defaults and user overrides
- Monthly average per bucket over a chosen date range
- New `/lender-expenses` page and API for summary + mapping CRUD
- Breakdown merchant groups: move-to-category for all matching txns in the selected period

## Capabilities

### New Capabilities

- `lender-expenses`: bucket definitions, category mapping, monthly expense summary

### Modified Capabilities

- `api`: lender expense endpoints; bulk categorise by breakdown group
- `frontend`: Living expenses page, sidebar nav, breakdown move-to-category

## Impact

- `database/` migration + `lender_expense.rs`
- `app/src/routes/lender_expenses.rs`
- `frontend/src/pages/lender-expenses.tsx`
