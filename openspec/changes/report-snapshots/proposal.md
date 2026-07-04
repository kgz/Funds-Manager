## Why

Broker reports must be **reproducible**: numbers handed to a lender months later must match exactly what was captured at generation time (#107 trust layer). Live APIs recompute from current data, so we need immutable point-in-time snapshots before the PDF generator (#117).

## What Changes

- Persist immutable broker report snapshots with `as_at` date, analysis period, optional account filter, and frozen JSON payload
- Capture payload from existing broker inputs: income, lender expenses, serviceability, assets, liabilities, net worth
- `POST/GET/DELETE /api/report-snapshots` — create, list, fetch, soft-delete
- `/report-snapshots` UI to save, list, view, and delete snapshots (read-only detail from stored payload)

## Capabilities

### New Capabilities

- `report-snapshots`: immutable capture, storage, list, fetch, delete

### Modified Capabilities

- `api`: report snapshot endpoints
- `frontend`: Report snapshots page, detail view, sidebar nav, route

## Impact

- Migration + `database/src/models/report_snapshot.rs`
- `app/src/routes/report_snapshots.rs`
- `frontend/src/pages/report-snapshots/` + types + route + sidebar

Closes #114. Part of broker milestone #107.
