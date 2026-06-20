## Why

Broker reports need characterised income — source, frequency, stability — not just raw recurring credits (#107 stage 2).

## What Changes

- Detect income streams from recurring credit detection with stability metrics
- Persist user labels, primary flag, confirmation, optional gross monthly
- New `/income` page and `GET/PUT /api/income-streams` API

## Capabilities

### Modified Capabilities

- `api`: income streams summary endpoint
- `frontend`: Income page

## Impact

- `database/` migration + `income_stream.rs`
- `app/src/routes/income_streams.rs`
- `frontend/src/pages/income.tsx`
