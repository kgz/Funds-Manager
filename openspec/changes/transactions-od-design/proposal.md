## Why

The Transactions page still carries dark-theme table chrome (gray status pills, green/red-400 amounts, dark transfer panel). Open Design `funds-transactions.html` defines the target warm-paper layout.

## What Changes

- Flat page header with subtitle and header actions (recategorize, new category)
- Single panel wrapping filters + table + pager
- Warm-paper amount colours, status pills, checkboxes, hide-transfers switch
- Pager label `Showing X–Y of N` on server pagination

## Capabilities

### New Capabilities
- `transactions-page-chrome`: Visual layout of Transactions toolbar, table, and pager

## Impact

- `frontend/src/pages/transactions.tsx`
- `frontend/src/components/table.tsx` (optional range pager label)
- Small helpers under `frontend/src/components/transactions/`
