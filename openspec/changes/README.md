# Dashboard improvements

Broken into independent OpenSpec changes. Recommended order:

| # | Change | Depends on | Effort |
|---|--------|------------|--------|
| 1 | `dashboard-chart-shell` | — | Small |
| 2 | `dashboard-ux-polish` | — (chart-shell nice-to-have) | Small |
| 3 | `dashboard-background` | — | Small |
| 4 | `dashboard-kpi-cards` | — | Small |
| 5 | `dashboard-date-filter` | — | Medium |
| 6 | `dashboard-layout` | kpi-cards, chart-shell | Small |
| 7 | `dashboard-spending-donut` | chart-shell | Medium |
| 8 | `dashboard-balance-chart` | chart-shell | Small |
| — | `dashboard-remove-parent-grouping` | ux-polish (done) | Small |

**Future / cleanup:** `dashboard-remove-parent-grouping` — drop unused group-by-parent dashboard toggle (auto-cat assigns leaf categories; use `/breakdown` instead).

**Tables:** `table-sorting-latest-first` — wire header sorting on statements/transactions; default date descending.

**Features:** `transaction-notes` — optional notes per transaction (DB + API + `/transactions` UI).

Start with: `/opsx:apply dashboard-ux-polish` or `dashboard-chart-shell`.
