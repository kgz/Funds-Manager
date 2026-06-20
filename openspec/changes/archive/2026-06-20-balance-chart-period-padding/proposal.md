## Why

The Balance Over Time chart only plots days with transactions, so a **1 year** filter can show a compressed x-axis (e.g. Dec–May) instead of the full selected period. Users expect the axis to match the dashboard date filter.

## What Changes

- Dashboard balance series and stacked balance queries use a daily grid from period start → end (when bounds are set), with carry-forward balances on days without transactions
- **All time** (no start/end): grid spans earliest → latest transaction day (unchanged intent, continuous line)

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `api`: dashboard analytics balance series / balance stack span the requested date range

## Impact

- `database/src/models/analytics.rs` — `dashboard()` balance SQL
