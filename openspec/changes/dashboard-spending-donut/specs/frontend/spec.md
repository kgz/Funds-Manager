## ADDED Requirements

### Requirement: Spending donut chart
The spending-by-category chart SHALL render as a donut with the total spending amount displayed in the centre.

#### Scenario: Centre total
- **WHEN** spending data is available
- **THEN** the donut centre shows the sum of all spending slices as formatted currency

### Requirement: Spending category list
The spending chart SHALL include a ranked list of categories with amount and percentage, replacing the default side legend.

#### Scenario: Ranked breakdown
- **WHEN** user views the spending chart
- **THEN** categories appear sorted by amount descending with percent of total
