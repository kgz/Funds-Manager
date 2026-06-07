## 1. Shared layout (#32)

- [x] 1.1 Layout primitives: PageShell, PageHeader, GlassCard, Modal, SegmentedControl, tokens
- [x] 1.2 Migrate dashboard, settings, transactions, statements, categories, recurring, breakdown
- [x] 1.3 Table chrome, sidebar, ChartCard, DESIGN.md

## 2. Transactions category UX

- [x] 2.1 Custom CategoryPicker (dark dropdown, grouped options, portal menu)
- [x] 2.2 Opaque menu, light text, close on scroll
- [x] 2.3 Aligned grid row; Apply suggestion button; no suggestions on categorized rows
- [x] 2.4 Segmented All | Uncategorized filter; two-row header toolbar

## 3. Statement upload stability

- [x] 3.1 r2d2 connection pool in `get_dbo()`
- [x] 3.2 Load CategoryPredictor once per upload batch
- [x] 3.3 Batch transaction insert per statement
