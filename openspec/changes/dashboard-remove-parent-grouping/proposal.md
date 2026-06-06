## Why

Auto-categorization assigns a specific `category_id` per transaction. The dashboard "group by parent" toggle only affects pie-chart display rollup and is unused in practice (default off). `/breakdown` already provides better category analysis. Removing it simplifies the dashboard and drops dead localStorage state.

## What Changes

- Remove `GroupByParentToggle` and `groupByParentCategory` state from dashboard
- Remove `groupByParentCategory` localStorage key
- Simplify chart aggregation to always use assigned `category_id`
- Simplify `spendingGroupKeyForTransaction` (drop parent rollup branch)
- **Keep** parent/subcategory hierarchy on `/categories` page and in DB (unchanged)

## Capabilities

### Modified Capabilities

- `frontend`: remove dashboard parent-grouping behaviour

## Impact

- `frontend/src/components/dashboard.tsx`
- `openspec/specs/frontend/spec.md` (on archive)

## Non-Goals

- Removing `parent_category_id` from categories API or database
- Changing auto-categorization or breakdown page
