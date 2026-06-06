## Why

Spending pie with a right-side legend is cramped on mobile and looks dated. A donut with centre total is cleaner and highlights the key number.

## What Changes

- Convert spending pie to donut (`innerRadius` ~60% of `outerRadius`)
- Centre label: total spending amount for active period
- Optional ranked category list below or beside donut (top 5 + "other")
- Income pie can stay as pie initially

## Capabilities

### Modified Capabilities

- `frontend`: spending chart presentation

## Impact

- `frontend/src/graphs/pie.tsx` (add `variant: 'pie' | 'donut'` prop)
- `frontend/src/components/dashboard.tsx`

## Dependencies

- `dashboard-chart-shell`
