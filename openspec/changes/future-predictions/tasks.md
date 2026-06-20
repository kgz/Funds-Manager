## 1. Database

- [x] 1.1 Migration: `prediction_scenarios`, `prediction_scenario_lines`, `prediction_goals`
- [x] 1.2 Diesel models + schema
- [x] 1.3 Soft-delete on scenarios and goals

## 2. API — baseline

- [x] 2.1 `GET /api/predictions/baseline` (monthly points, metadata, planned spending)
- [x] 2.2 Optional repeat-adjustment payload or client merge contract documented
- [x] 2.3 `GET /api/predictions/scenario/{id}` projection
- [x] 2.4 Rust tests for monthly projection and goal gap math

## 3. API — CRUD

- [x] 3.1 Scenario + lines CRUD
- [x] 3.2 Goals CRUD
- [x] 3.3 Register routes

## 4. Frontend — data layer

- [x] 4.1 Types + API clients
- [x] 4.2 Redux slices/thunks for scenarios, goals, baseline

## 5. Frontend — page

- [x] 5.1 `/predictions` shell: header, horizon selector, account filter
- [x] 5.2 Baseline chart (monthly balance line)
- [x] 5.3 Scenario list + add/edit (lines with frequency)
- [x] 5.4 Toggle scenarios on chart (multi-line compare)
- [x] 5.5 Goals list + add/edit + gap / suggested monthly display
- [x] 5.6 Integrate repeat payments from recurring detection into baseline
- [x] 5.7 Route + sidebar nav
- [x] 5.8 Empty/loading/error states

## 6. Verification

- [x] 6.1 `cargo test` in `database/` and `app/`
- [x] 6.2 `pnpm run build:embed`
- [x] 6.3 Manual QA: baseline, two scenarios compared, goal gap
- [x] 6.4 PR references Closes #97 and links #29
