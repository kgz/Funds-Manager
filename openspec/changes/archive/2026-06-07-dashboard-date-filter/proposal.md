## Why

Dashboard shows all-time data with no control. A simple period filter makes charts and KPIs relevant to "this month" vs history.

## What Changes

- Period control: `This month` | `Last 3 months` | `All time`
- Filter applied client-side to all dashboard `useMemo` computations
- Persist selection in localStorage
- KPI cards and charts all respect filter

## Capabilities

### Modified Capabilities

- `frontend`: dashboard date filtering

## Impact

- `frontend/src/components/dashboard.tsx`
- KPI, pie, bar, line memos
