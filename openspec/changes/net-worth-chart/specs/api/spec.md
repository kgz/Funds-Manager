## ADDED Requirements

### Requirement: Net worth over time endpoint

`GET /api/analytics/net-worth` SHALL return a time series of net worth over the requested range, accepting optional `start`, `end` (ISO `YYYY-MM-DD`) and `account_id` query params. Each point SHALL include `availableCash`, `assets`, `liabilities`, and `netWorth` in dollars.

#### Scenario: Series returned
- **WHEN** balance history exists in the range
- **THEN** the response is an ordered array of points where `netWorth = availableCash + assets - liabilities`

#### Scenario: Carry-forward
- **WHEN** a month has no statement for an account
- **THEN** that account's last known balance is carried forward into the series

#### Scenario: Account filter excludes manual registers
- **WHEN** `account_id` is provided
- **THEN** `assets` and `liabilities` are `0` and `availableCash` reflects only that account
