## Why

Repeat payments (`/recurring`) still uses the legacy glass header and neon money colours while the rest of the cash-flow redesign has moved to the warm-paper OD system. There is no OD HTML reference for this screen (#226), which blocks a consistent React port.

## What Changes

- Add `funds-repeat-payments.html` (+ `recurring.css` if needed) in the redesign bundle
- Port `frontend/src/pages/recurring.tsx` to OD page shell, panel table, KPI summary, filters, and semantic money colours
- Replace `PageHeader` / `StatCard` patterns with flat header + inline summary consistent with Income and Breakdown
- Align expandable category grouping UI with breakdown sub-row patterns
- Add `check:money-colors` compliance for repeat-payments money display

## Capabilities

### New Capabilities

- `repeat-payments-ui`: Repeat payments page layout, filters, summary KPIs, pattern/category views, and table interactions matching OD

### Modified Capabilities

## Impact

- `frontend/src/pages/recurring.tsx`
- `frontend/src/components/recurring/*` (help, shared table pieces)
- `design/funds-manager-redesign-5e1b/funds-repeat-payments.html`
- Tracker row #226; board In progress
