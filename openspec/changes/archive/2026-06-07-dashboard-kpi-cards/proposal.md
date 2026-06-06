## Why

Users must read charts to learn basic numbers. Summary cards at the top give instant context (balance, spend, income, net).

## What Changes

- KPI row above charts: current balance, period spending, period income, net (income − spending)
- Uses existing Redux transaction data (no API change)
- Initially all-time; `dashboard-date-filter` will scope these later

## Capabilities

### Modified Capabilities

- `frontend`: dashboard summary metrics

## Impact

- `frontend/src/components/dashboard.tsx`
- Optional `frontend/src/components/dashboard/KpiCards.tsx`
