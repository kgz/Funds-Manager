## Current state

| Page | Default order | Header sort works? |
|------|---------------|-------------------|
| `/transactions` | Date desc (hardcoded in filter memo) | No — missing `sortState` |
| `/statements` | API order (unspecified) | No — missing `sortState` |
| `/recurring` | Configurable | Yes |

`Table` does not sort internally; parent must sort `data` before passing it in.

## Decisions

- **Default `sortState`**: `{ key: 'date' \| 'transaction_date', direction: 'desc' }` per page
- **Sort flow**: `onSortChange` updates state → `useMemo` sorts filtered rows using column `sortFunction` or default compare
- **Tie-break**: when primary sort equal, use `id` descending (transactions already does this for date)
- **Statements date key**: `date` (statement period)
- **Transactions date key**: `transaction_date`

## Optional helper

Export `sortRows<T>(rows, columns, sortState)` from `table.tsx` to avoid duplicating sort logic across pages.
