## Why

Users need to record **upcoming discretionary spending** (holidays, renovations, known one-offs) separately from historical transactions and heuristic repeat-payment detection. This is input for cashflow thinking now and for **#97 Future predictions** later.

## What Changes

- New `planned_spending` persistence (Postgres) with CRUD API
- New `/planned` page: list, add, edit, delete planned items
- Fields: name, amount, start date, optional end date, optional category, optional notes
- Period filter (month + custom range) with **planned total** for that window
- Sidebar nav entry under General
- Account filter wired on the page (same global filter as other analytics pages)

## Capabilities

### New Capabilities

- `planned-spending`: data model, API, and business rules for planned spending items

### Modified Capabilities

- `api`: register planned spending REST routes
- `frontend`: new page, nav link, Redux thunks, period summary UI

## Impact

- `database/migrations/` — `planned_spending` table
- `database/src/models/`, `schema.rs`
- `app/src/routes/planned_spending.rs` (new)
- `frontend/src/pages/planned.tsx` (new), sidebar, `App.tsx` routes
- `frontend/src/store/thunks/` — CRUD + list with date range
- Feeds #97 later; overlaps conceptually with #33 (trip mode) but narrower scope

## Non-Goals (this change)

- Dashboard overlay / cashflow chart integration (follow-up)
- Recurring planned items / templates
- Multi-user or per-account planned budgets
- Trip mode (#33)
