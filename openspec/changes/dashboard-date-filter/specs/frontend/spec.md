## ADDED Requirements

### Requirement: Dashboard date range filter
The dashboard SHALL provide a period selector with at least "This month", "Last 3 months", and "All time". All dashboard charts and summary metrics SHALL respect the selected period.

#### Scenario: Filter charts
- **WHEN** user selects "This month"
- **THEN** pie, bar, line charts and KPI cards only include transactions from the current calendar month

#### Scenario: Persist selection
- **WHEN** user changes the period and reloads the page
- **THEN** the previously selected period is restored from localStorage
