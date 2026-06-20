## ADDED Requirements

### Requirement: Net worth chart

The dashboard SHALL display a net-worth-over-time chart driven by `GET /api/analytics/net-worth`, using the existing period selector and account filter.

#### Scenario: Renders trend
- **WHEN** net worth data exists for the selected range
- **THEN** the dashboard shows a net worth trend line with a currency y-axis

#### Scenario: Account filter
- **WHEN** the user changes the account filter
- **THEN** the chart updates without a full page reload

#### Scenario: Empty state
- **WHEN** no balance history exists for the range
- **THEN** the chart shows an empty/insufficient-data state
