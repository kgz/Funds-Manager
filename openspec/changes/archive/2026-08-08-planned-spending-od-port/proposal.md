## Why

Planned spending (`/planned`) still uses legacy glass `PageHeader`, amber match callouts, and raw green/red money colours. There is no OD HTML reference (#227), blocking a consistent warm-paper port.

## What Changes

- Add `funds-planned-spending.html` (+ `planned.css` if needed) in the redesign bundle
- Port `frontend/src/pages/planned.tsx` to OD flat header, panel table, KPI strip, filters, match suggestions, and semantic money colours
- Restyle add/edit/link modals to match income/repeat-payments dialog patterns
- Wire sidebar active state for Planned spending

## Capabilities

### New Capabilities

- `planned-spending-ui`: Planned spending page layout, period filters, totals, item table, match suggestions, and modals matching OD

### Modified Capabilities

## Impact

- `frontend/src/pages/planned.tsx`
- `design/funds-manager-redesign-5e1b/funds-planned-spending.html`
- Tracker #227; board In progress
