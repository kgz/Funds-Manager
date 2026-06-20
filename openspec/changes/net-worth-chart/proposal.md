## Why

The dashboard shows cash-flow KPIs for a single period but no view of **total net worth over time**. With multiple bank accounts plus the new liabilities (#108) and assets (#109) registers, users need one trend line answering "where am I headed?" — and it's the centrepiece of the broker-ready report (#107).

## What Changes

- New `GET /api/analytics/net-worth` endpoint returning a time series of `availableCash`, `assets`, `liabilities`, and `netWorth`
- New **Net worth over time** chart on the dashboard, wired to the existing period selector and account filter
- Net worth = available cash (statement/transaction balance history, carried forward) + manual assets − manual liabilities

## Capabilities

### Modified Capabilities

- `api`: new net-worth analytics route
- `frontend`: net-worth chart on the dashboard

## Impact

- `database/src/models/analytics.rs` — `net_worth_over_time(...)`
- `app/src/routes/analytics_api.rs` — `/net-worth` route + handler
- `frontend/src/store/thunks/analytics.ts` — `fetchNetWorthOverTime` + types
- `frontend/src/graphs/net-worth.tsx` (new), `frontend/src/components/dashboard.tsx`
- Consumes #108/#109; feeds #57 (LVR/equity) and #117 (broker report)

## Non-Goals (this change)

- Per-asset-class breakdown / stacked decomposition (response shape leaves room for it)
- Historical valuation snapshots for manual assets/liabilities (only current value is known)
- Equity / LVR computation (#57)
- Forecasting / projection lines
