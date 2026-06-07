## Why

Statements and transactions tables mark columns as `sortable` but never pass `sortState` / `onSortChange` to `Table`, so header clicks do nothing. Transactions are pre-sorted latest-first in a filter memo without visual indicator. Users expect clickable headers and newest items at the top by default.

## What Changes

- Wire column sorting on `/statements` and `/transactions` via `Table` sort props
- Default sort: date column, descending (latest first)
- Show sort direction indicator on active column header
- Shared sort helper to apply `sortFunction` from column defs

## Capabilities

### Modified Capabilities

- `frontend`: data table sorting behaviour

## Impact

- `frontend/src/components/table.tsx` (optional shared `sortRows` helper)
- `frontend/src/pages/statements.tsx`
- `frontend/src/pages/transactions.tsx`

## Reference

`/recurring` already implements parent-controlled sort correctly — reuse that pattern.

## Non-Goals

- Sort persistence in localStorage
- Backend sort parameters
- `/breakdown` custom tables (separate sort UI already)
