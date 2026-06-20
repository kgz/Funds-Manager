## ADDED Requirements

### Requirement: Dashboard balance charts span the selected period

When dashboard analytics are requested with `start` and `end` dates, `balanceSeries` and `balanceStack.rows` SHALL include one point per calendar day from `start` through `end` (inclusive).

Each day SHALL use carry-forward balances: the latest non-deleted transaction balance per account on or before that day.

When `start` and `end` are omitted (**All time**), the series SHALL span from the earliest to the latest transaction day in the filtered data.

#### Scenario: Rolling one-year period

- **WHEN** analytics are fetched with a twelve-month start and end
- **THEN** balance chart data includes every day in that range, not only days with new transactions

#### Scenario: All time

- **WHEN** analytics are fetched without start or end
- **THEN** balance chart data spans the full transaction history with a daily grid between first and last transaction days
