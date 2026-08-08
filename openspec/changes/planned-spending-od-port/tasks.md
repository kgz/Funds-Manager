## 1. Design

- [x] 1.1 Land OD `funds-planned-spending.html` (+ CSS) from design run #227
- [x] 1.2 Review against `planned.tsx`; adjust OD if needed

## 2. Page shell & filters

- [x] 2.1 Replace `PageHeader` with OD flat header + subtitle
- [x] 2.2 Move period filters, search, and add action into header/body toolbar per OD
- [x] 2.3 Use `PageShell variant="table"` + `pageBodyClass`

## 3. Summary, matches & table

- [x] 3.1 Port planned total KPI to OD kpi strip (semantic colours)
- [x] 3.2 Restyle match suggestions callout to warm-paper OD pattern
- [x] 3.3 Restyle table to panel + OD headers/cells
- [x] 3.4 Port row actions and linked-payment sublines

## 4. Modals & money semantics

- [x] 4.1 Restyle add/edit/link modals to OD dialog pattern
- [x] 4.2 Replace legacy money colours with `moneySemantics` helpers
- [x] 4.3 Verify `pnpm run check:money-colors` for touched files

## 5. Quality

- [x] 5.1 `cd frontend && pnpm run build`
- [ ] 5.2 Manual QA: filters, search, add/edit/delete, link, match dismiss, mark complete
