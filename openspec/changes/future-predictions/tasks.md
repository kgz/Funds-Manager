## 1. Database

- [ ] 1.1 Migration: `prediction_scenarios`, `prediction_scenario_lines`, `prediction_goals`
- [ ] 1.2 Diesel models + schema
- [ ] 1.3 Soft-delete on scenarios and goals

## 2. API — baseline

- [ ] 2.1 `GET /api/predictions/baseline` (monthly points, metadata, planned spending)
- [ ] 2.2 Optional repeat-adjustment payload or client merge contract documented
- [ ] 2.3 `GET /api/predictions/scenario/{id}` projection
- [ ] 2.4 Rust tests for monthly projection and goal gap math

## 3. API — CRUD

- [ ] 3.1 Scenario + lines CRUD
- [ ] 3.2 Goals CRUD
- [ ] 3.3 Register routes

## 4. Frontend — data layer

- [ ] 4.1 Types + API clients
- [ ] 4.2 Redux slices/thunks for scenarios, goals, baseline

## 5. Frontend — page

- [ ] 5.1 `/predictions` shell: header, horizon selector, account filter
- [ ] 5.2 Baseline chart (monthly balance line)
- [ ] 5.3 Scenario list + add/edit (lines with frequency)
- [ ] 5.4 Toggle scenarios on chart (multi-line compare)
- [ ] 5.5 Goals list + add/edit + gap / suggested monthly display
- [ ] 5.6 Integrate repeat payments from recurring detection into baseline
- [ ] 5.7 Route + sidebar nav
- [ ] 5.8 Empty/loading/error states

## 6. Verification

- [ ] 6.1 `cargo test` in `database/` and `app/`
- [ ] 6.2 `pnpm run build:embed`
- [ ] 6.3 Manual QA: baseline, two scenarios compared, goal gap
- [ ] 6.4 PR references Closes #97 and links #29
