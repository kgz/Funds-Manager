## 1. Remove UI

- [ ] 1.1 Delete `GroupByParentToggle` component and header control
- [ ] 1.2 Remove `groupByParentCategory` state and localStorage read/write

## 2. Simplify aggregation

- [ ] 2.1 Remove parent rollup from pie chart `useMemo` (always use assigned category)
- [ ] 2.2 Simplify `spendingGroupKeyForTransaction` to category id only
- [ ] 2.3 Update spending breakdown filter to match assigned category keys

## 3. Cleanup

- [ ] 3.1 Remove `groupByParentCategory` from localStorage if present
