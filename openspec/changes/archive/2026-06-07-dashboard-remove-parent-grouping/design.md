## Decisions

- Charts and spending drill-down group by `String(tx.category_id ?? 'unknown')` only
- Remove `spendingGroupKeyForTransaction` parent branch; inline or simplify to category id key
- Clear stale `groupByParentCategory` from localStorage on first load after deploy (optional one-time cleanup in useEffect)

## Rationale

Parent hierarchy remains useful for organizing categories and mappings, but dashboard display rollup duplicates breakdown without matching auto-cat behaviour.
