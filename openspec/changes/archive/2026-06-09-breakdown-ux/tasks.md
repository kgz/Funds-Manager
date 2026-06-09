## 1. Date range controls

- [x] 1.1 Reuse `PeriodFilter` with breakdown preset periods (no all-time)
- [x] 1.2 Presets / Custom segmented toggle with persisted range in localStorage
- [x] 1.3 Inline custom date inputs (single row, no layout jump on mode switch)

## 2. Page chrome

- [x] 2.1 `PageShell` + bordered header toolbar (match transactions/statements)
- [x] 2.2 `StatCard` row: period spending, income, net
- [x] 2.3 `PageHeader` pending bar + refresh opacity while reloading

## 3. States and table

- [x] 3.1 `PageLoadingState` / `ErrorState` with retry / `EmptyState` for no data
- [x] 3.2 `InlineAlert` for invalid range and partial load errors
- [x] 3.3 `GlassCard` table wrapper; design tokens (`text-white/*`)

## 4. Shared period filter API

- [x] 4.1 `PeriodFilter` accepts optional `periods` and `ariaLabel` props
