## Why

Charts sit on bare padding with default Recharts light-theme grid/axis colours. A shared card shell and dark chart theme makes every dashboard chart look intentional and unlocks later layout work.

## What Changes

- `ChartCard` wrapper component (title, optional subtitle/actions, children)
- Shared Recharts theme constants (grid, axis, tick, tooltip base)
- Apply to pie, bar, and line charts on dashboard

## Capabilities

### Modified Capabilities

- `frontend`: dashboard chart presentation requirements

## Impact

- `frontend/src/components/` (new `ChartCard`)
- `frontend/src/graphs/pie.tsx`, `bar.tsx`
- `frontend/src/components/dashboard.tsx`
