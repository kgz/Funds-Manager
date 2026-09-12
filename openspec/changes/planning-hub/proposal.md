## Why

Evolve Planned spending into a **Planning** hub (#143): cashflow plans plus loan lifecycle events (redraw, refinance, repayment change). API renames to `/api/planning`. Port the warm-paper OD design (`funds-planning.html`) in detail.

## Delivery

- **v1 (#143, this change):** hub + four kinds CRUD/UI; predictions apply **cashflow + redraw only**
- **v2 (#294):** refinance / repayment-change drive predictions, liabilities apply, net worth

## What Changes (v1)

- DB: `plan_kind` + loan fields on `planned_spending`
- API: `/api/planning` primary; `/api/planned-spending` alias
- UI: `/planning` (+ `/planned` redirect), nav **Planning**, kind filters, badges, add/edit modal with kind picker + impact previews
- ⌘K: four kind-specific deep links that open Add plan with kind pre-selected
- Predictions: cashflow as today; **redraw** once cash credit on date; refinance / repayment-change **not** applied to baseline
- Match/link flows remain **cashflow-only**

## Capabilities

### New Capabilities

- `planning`: multi-kind planning hub (API + UI contract)

### Modified Capabilities

- `planned-spending`: extend fields / kinds; keep soft-delete and list filters
- `planned-spending-ui`: rebrand to Planning; kind UX
- `frontend`: route `/planning`, nav, commands
- `api`: `/api/planning` routes
- `future-predictions`: apply **redraw** (and cashflow) lump sums; refinance/repayment deferred to #294

## Impact

- `database/migrations`, `schema.rs`, `models/planned_spending.rs`, `prediction_engine.rs`
- `app/src/routes/planned_spending.rs` (+ planning alias), `ai_api.rs`
- `frontend`: `planned.tsx` → planning page, navigation, types, thunks
- Design reference: `design/funds-manager-redesign-5e1b/funds-planning.html`, `css/planning.css`, `PLANNING.md`

Closes #143 (v1 only; see #294 for drive-the-app work)
