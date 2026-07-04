## Why

Broker reports assume continuous statement history. Missing months must be visible in the analysis window, not silently averaged over (#107 trust layer).

## What Changes

- Window-bound statement coverage per account (`start_date` → `end_date`)
- `GET /api/report-coverage/summary` with gaps list and sufficient flag
- Coverage stored in report snapshot payload at capture
- Report snapshots UI warns before save when coverage is insufficient

## Capabilities

### New Capabilities

- `report-coverage`: statement month coverage for a date range

### Modified Capabilities

- `api`: report coverage endpoint
- `frontend`: coverage banner on report snapshots
- `report-snapshots`: embed coverage in snapshot payload

## Impact

- `database/src/models/report_coverage.rs`, refactor `statement.rs` helpers
- `app/src/routes/report_coverage.rs`
- `database/src/models/report_snapshot.rs`, frontend report-snapshots pages

Closes #115. Part of broker milestone #107.
