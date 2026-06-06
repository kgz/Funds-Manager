## 1. Remove UI

- [x] 1.1 Delete `GroupByParentToggle` component and header control
- [x] 1.2 Remove `groupByParentCategory` state and localStorage read/write

## 2. Simplify aggregation

- [x] 2.1 Remove parent rollup from pie chart `useMemo` (always use assigned category)
- [x] 2.2 Simplify `spendingGroupKeyForTransaction` to category id only
- [x] 2.3 Update spending breakdown filter to match assigned category keys

## 3. Cleanup

- [x] 3.1 Remove `groupByParentCategory` from localStorage if present
