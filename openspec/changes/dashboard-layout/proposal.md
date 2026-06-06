## Why

Monthly trends are buried below two pies. Reordering puts the most useful overview first and improves scanability.

## What Changes

Reorder dashboard sections to:

1. Header + controls
2. KPI cards (from `dashboard-kpi-cards`)
3. Monthly bar chart (full width)
4. Spending pie | Income pie
5. Balance line (full width)

## Capabilities

### Modified Capabilities

- `frontend`: dashboard section order

## Impact

- `frontend/src/components/dashboard.tsx` only

## Dependencies

- `dashboard-kpi-cards` and `dashboard-chart-shell` should land first (or layout done together)
