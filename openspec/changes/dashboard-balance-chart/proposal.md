## Why

Balance line chart has three reference lines (avg, min, max) plus legend — visually noisy. Simplifying improves readability; min/max can live in KPI row later.

## What Changes

- Remove min and max reference lines
- Keep single average reference line (dashed, subtle) OR remove all reference lines — design says keep avg only
- Remove redundant legend entries for reference lines
- Smoother line styling (stroke width, optional area gradient)

## Capabilities

### Modified Capabilities

- `frontend`: balance chart presentation

## Impact

- `frontend/src/components/dashboard.tsx`

## Dependencies

- `dashboard-chart-shell`
