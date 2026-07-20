## ADDED Requirements

### Requirement: Period summary is net-first
The Breakdown toolbar SHALL show a single period summary surface with net as the primary figure and period income / period spending as secondary detail, instead of three equal StatCards.

#### Scenario: Valid range shows summary
- **WHEN** the selected date range is valid and totals are available
- **THEN** the toolbar shows net prominently with income and spending listed beside or below it

#### Scenario: Invalid range hides summary
- **WHEN** the custom range is invalid
- **THEN** the period summary is not shown

### Requirement: Parent spend share includes a bar
Each parent category row SHALL display `% of spending` with a thin horizontal share bar sized to that percentage when spending share is greater than zero.

#### Scenario: Spending category shows share bar
- **WHEN** a parent category has spending in the period
- **THEN** its `% of spending` cell shows a percentage and a share bar

#### Scenario: Zero spending shows dash
- **WHEN** a parent category has no spending in the period
- **THEN** the share cell shows an em dash (or equivalent empty marker) without a bar
