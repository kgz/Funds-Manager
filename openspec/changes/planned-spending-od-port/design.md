## Context

Planned spending tracks upcoming expenses/income the user expects but has not imported yet. The React page supports preset/custom date ranges, search, planned total KPI, match suggestions (link to transactions), link modal, add/edit/delete modals, spending vs income amount type, and row actions (link, edit, delete, mark complete). Items are global (account filter shown but does not filter data per subtitle).

## Goals / Non-Goals

**Goals**
- OD prototype `funds-planned-spending.html` mirroring production behaviour
- React port: flat `page-header`, `page-body`, panel table, OD tokens, semantic money colours
- Preserve all API behaviour and match-linking flows

**Non-Goals**
- Planning hub rebrand (#143)
- Sidebar command palette (#215)
- Changing planned-spending backend or match algorithm

## Decisions

1. **Layout** — `PageShell variant="table"` + sticky flat header (title/subtitle, primary "Add planned item" in actions). Filters (account, preset/custom range, period picker) in header actions or body toolbar row.
2. **KPI** — Planned total in body KPI card (semantic colour from signed cents) with hint text for search/period scope.
3. **Match suggestions** — Warm callout panel above table (OD accent/warn mix, not dark amber-950); actionable badge count; link/dismiss buttons.
4. **Table** — OD `table.data`: Name (+ match badge, linked progress), Amount, Date, Category pill, Notes, row actions.
5. **Modals** — Add/edit with name, amount, spending/income toggle, date, category picker, notes; link modal unchanged behaviour, OD-styled.
6. **Money** — `moneySemantics.ts` helpers; no `text-green-*` / `text-red-*`.

## Risks / Trade-offs

- Dense action column on narrow screens → horizontal scroll in panel like transactions
- Account filter is informational only — keep subtitle explaining global items

## Open Questions

- None blocking; confirm OD match callout styling after design run
