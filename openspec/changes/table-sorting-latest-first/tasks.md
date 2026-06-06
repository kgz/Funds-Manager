## 1. Shared sort helper

- [ ] 1.1 Add `sortRows` helper in `table.tsx` (uses column `sortFunction` when present)
- [ ] 1.2 Export `SortState` / `SortDirection` if not already exported for page use

## 2. Transactions page

- [ ] 2.1 Add `sortState` defaulting to `transaction_date` desc
- [ ] 2.2 Wire `onSortChange` and pass `sortState` to `Table`
- [ ] 2.3 Move sort from filter memo into dedicated sorted-data memo using `sortRows`
- [ ] 2.4 Add `sortFunction` for `description` and `status` if missing

## 3. Statements page

- [ ] 3.1 Add `sortState` defaulting to `date` desc
- [ ] 3.2 Wire `onSortChange` and pass `sortState` to `Table`
- [ ] 3.3 Sort `statements` data before passing to `Table`
- [ ] 3.4 Fix `Table<Statement>` generic usage (remove invalid second type param)
