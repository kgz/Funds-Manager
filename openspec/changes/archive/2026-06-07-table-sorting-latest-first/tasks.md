## 1. Shared sort helper

- [x] 1.1 Add `sortRows` helper in `table.tsx` (uses column `sortFunction` when present)
- [x] 1.2 Export `SortState` / `SortDirection` if not already exported for page use

## 2. Transactions page

- [x] 2.1 Add `sortState` defaulting to `transaction_date` desc
- [x] 2.2 Wire `onSortChange` and pass `sortState` to `Table`
- [x] 2.3 Move sort from filter memo into dedicated sorted-data memo using `sortRows`
- [x] 2.4 Add `sortFunction` for `description` and `status` if missing

## 3. Statements page

- [x] 3.1 Add `sortState` defaulting to `date` desc
- [x] 3.2 Wire `onSortChange` and pass `sortState` to `Table`
- [x] 3.3 Sort `statements` data before passing to `Table`
- [x] 3.4 Fix `Table<Statement>` generic usage (remove invalid second type param)
