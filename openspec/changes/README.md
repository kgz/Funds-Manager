# Dashboard improvements

Broken into independent OpenSpec changes. Recommended order:

| # | Change | Depends on | Effort |
|---|--------|------------|--------|
| 1 | `dashboard-chart-shell` | — | Small |
| 2 | `dashboard-ux-polish` | — (chart-shell nice-to-have) | Small |
| 3 | `dashboard-background` | — | Small ✓ archived |
| 4 | `dashboard-kpi-cards` | — | Small ✓ archived |
| 5 | `dashboard-date-filter` | — | Medium ✓ archived |
| 6 | `dashboard-layout` | kpi-cards, chart-shell | Small ✓ archived |
| 7 | `dashboard-spending-donut` | chart-shell | Medium ✓ archived |
| 8 | `dashboard-balance-chart` | chart-shell | Small ✓ archived |
| — | `dashboard-remove-parent-grouping` | ux-polish (done) | Small ✓ archived |

**Future / cleanup:** `dashboard-remove-parent-grouping` — drop unused group-by-parent dashboard toggle (auto-cat assigns leaf categories; use `/breakdown` instead).

**Tables:** `table-sorting-latest-first` — wire header sorting on statements/transactions; default date descending. ✓ archived

**UI:** `ui-consistency` — shared layout primitives, transactions category picker/suggestions, statement upload pool. ✓ archived

**Features:** `transaction-notes` — optional notes per transaction (DB + API + `/transactions` UI).

**Security:** `user-auth-data-encryption` — login/session auth + AES-256-GCM encryption for sensitive fields at rest.

**Data:** `bank-account-tracking` — financial accounts registry, per-bank filtering, targeted analysis.

Start with: `/opsx:apply dashboard-chart-shell` or `bank-account-tracking`.
