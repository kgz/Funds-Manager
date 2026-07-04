## Why

Brokers assess **income − repayments − living expenses = surplus** first, usually with a rate buffer on variable debt (#107 stage 3). We have income (#110), liabilities (#108), and lender living expenses (#112) but no combined serviceability view.

## What Changes

- Monthly surplus calculation combining income summary, liability repayments, and lender expense summary
- Stress-tested surplus with configurable rate buffer (default +3%) on variable-rate debts
- Committed vs discretionary living expense split
- `GET /api/serviceability/summary` with report-ready JSON breakdown
- New `/serviceability` page under Cash flow

## Capabilities

### New Capabilities

- `serviceability`: surplus calculation, stress test, committed/discretionary split

### Modified Capabilities

- `api`: serviceability summary endpoint
- `frontend`: Serviceability page, sidebar nav, route

## Impact

- `database/src/models/serviceability.rs`
- `app/src/routes/serviceability.rs`
- `frontend/src/pages/serviceability.tsx`, types, route, sidebar

Closes #111. Part of broker milestone #107.
