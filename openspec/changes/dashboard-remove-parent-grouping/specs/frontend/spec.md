## REMOVED Requirements

### Requirement: Dashboard group-by toggle
**Reason**: Redundant with auto-categorization (assigns specific category) and `/breakdown` page. Default was off and unused.
**Migration**: Dashboard pie charts always show assigned category; use `/breakdown` for deeper analysis.

## MODIFIED Requirements

### Requirement: Dashboard preferences
The dashboard SHALL treat negative transaction amounts as spending in charts. Pie charts and spending drill-down SHALL aggregate by assigned `category_id` only, not parent category rollup.

#### Scenario: Chart by assigned category
- **WHEN** user views spending or income pie charts
- **THEN** each slice reflects the transaction's assigned `category_id`

#### Scenario: Spending drill-down
- **WHEN** user clicks a pie segment
- **THEN** a sidebar shows transactions for that assigned category group
