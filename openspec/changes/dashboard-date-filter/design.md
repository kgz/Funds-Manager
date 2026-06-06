## Decisions

- **Filter UI**: pill button group in dashboard header next to group-by toggle
- **Storage key**: `dashboardDateRange` in localStorage
- **Ranges**:
  - `this-month`: transaction_date >= start of current calendar month
  - `last-3-months`: >= first day of month 2 months ago
  - `all`: no filter
- **Balance chart**: filter transactions before computing line; current balance KPI uses latest filtered tx

## Non-Goals

- Custom date picker
- Server-side filtering
