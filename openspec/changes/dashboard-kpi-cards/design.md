## Decisions

- **Metrics** (all-time until date filter lands):
  - Current balance: latest transaction by date `balance / 100`
  - Total spending: sum of negative amounts (abs)
  - Total income: sum of positive amounts
  - Net: income − spending
- **Layout**: responsive `grid grid-cols-2 lg:grid-cols-4 gap-4`
- **Formatting**: reuse `formatCurrencyWithCommas` from dashboard

## Non-Goals

- Month-scoped KPIs (deferred to `dashboard-date-filter`)
