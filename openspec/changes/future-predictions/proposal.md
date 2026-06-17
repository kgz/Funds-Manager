## Why

Users can see past spending and record planned items (#96), but cannot answer **“where am I heading?”** — balance runway, what-if adjustments, or whether a savings goal is realistic. **#97** adds forward-looking projections with comparable scenarios and goal gaps, building on repeat payments (#95) and planned spending as inputs.

## What Changes

- New **`/predictions`** page: baseline balance forecast chart + horizon selector (3 / 6 / 12 months, custom)
- **Baseline** from current balance, historical income/spend trend, detected repeat payments, and planned spending in range
- **Scenarios**: named what-if sets with adjustment lines (amount, frequency, optional dates/category); compare 2+ on one chart
- **Goals**: target amount + date → projected vs goal and suggested monthly saving to close the gap
- Persist scenarios and goals in **Postgres** (same durability story as planned spending)
- REST API for forecast baseline, scenarios, goals CRUD
- Sidebar nav **Future predictions** (plain-language copy, no “heuristic” jargon)

## Capabilities

### New Capabilities

- `future-predictions`: baseline projection, scenarios, goals, comparison chart data

### Modified Capabilities

- `api`: prediction/scenario/goal routes
- `frontend`: new page, nav, chart + forms

## Impact

- `database/migrations/` — `prediction_scenarios`, `prediction_scenario_lines`, `prediction_goals` (names TBD in design)
- `database/src/models/`, `app/src/routes/`
- `frontend/src/pages/predictions.tsx`, graphs, Redux/thunks
- Reads: analytics balance, recurring detection output, `GET /api/planned-spending`
- Links **#29** (forecasting parent); may close or reference when shipped

## Non-Goals (v1)

- Tax, investment returns, multi-account consolidation (#56)
- Dashboard embed of forecast (defer)
- Automatic scenario generation from planned spending rows
