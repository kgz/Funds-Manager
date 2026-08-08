## 1. Design

- [x] 1.1 Land OD `funds-repeat-payments.html` (+ CSS) from design run #226
- [x] 1.2 Review columns/interactions against `recurring.tsx`; adjust OD if needed

## 2. Page shell & filters

- [x] 2.1 Replace `PageHeader` with OD flat header + `pageSubtitleClass`
- [x] 2.2 Move account filter, view segmented control, min-occurrences into header actions
- [x] 2.3 Use `PageShell variant="table"` + `pageBodyClass` spacing

## 3. Summary & table

- [x] 3.1 Port monthly spending/income KPIs to OD kpi strip (semantic colours)
- [x] 3.2 Restyle table headers/cells to match income/breakdown (`tableThClass` / panel)
- [x] 3.3 Port category expandable sections with OD sub-row background
- [x] 3.4 Wire help affordance to existing `RepeatPaymentsHelp`

## 4. Money semantics

- [x] 4.1 Replace `text-green-*` / `text-red-*` with `moneySemantics` helpers
- [x] 4.2 Verify `pnpm run check:money-colors` passes for touched files

## 5. Quality

- [x] 5.1 `cd frontend && pnpm run build`
- [ ] 5.2 Manual QA: pattern view, category expand, filters, empty state, help
