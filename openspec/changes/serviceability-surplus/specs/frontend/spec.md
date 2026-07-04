## ADDED Requirements

### Requirement: Serviceability page

The SPA SHALL provide `/serviceability` showing monthly surplus, stressed surplus, and breakdown of income, repayments, and living expenses for a selected period.

#### Scenario: Navigation
- **WHEN** user opens the sidebar Cash flow section
- **THEN** a link to **Serviceability** is visible

#### Scenario: Period filter
- **WHEN** user changes the date range
- **THEN** surplus figures reload for that range

#### Scenario: Stress buffer display
- **WHEN** the page loads
- **THEN** stressed surplus reflects the default +3% buffer on variable debts and the buffer value is shown
