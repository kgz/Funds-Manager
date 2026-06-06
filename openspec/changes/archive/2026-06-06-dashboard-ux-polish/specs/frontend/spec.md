## ADDED Requirements

### Requirement: Dashboard group-by toggle
The dashboard SHALL present "Group by parent category" as a styled toggle control (not a raw HTML checkbox), using the app's dark-theme border and accent tokens.

#### Scenario: Toggle visible and accessible
- **WHEN** user views the dashboard header controls
- **THEN** the grouping option is a button-style or switch control with clear on/off state

### Requirement: Spending pie click affordance
When the spending pie supports drill-down, the dashboard SHALL display hint text indicating slices are clickable.

#### Scenario: Hint shown for spending chart
- **WHEN** spending pie has click handler enabled
- **THEN** helper text appears below the chart title

### Requirement: Dashboard empty state
When no transactions are loaded and loading is complete, the dashboard SHALL show an empty state with guidance and a link to the statements upload page.

#### Scenario: No data guidance
- **WHEN** transaction list is empty after fetch completes
- **THEN** user sees a message and navigation to `/statements`

### Requirement: Dashboard loading skeleton
While initial dashboard data loads, the page SHALL show skeleton placeholders instead of a lone centered spinner.

#### Scenario: Loading layout
- **WHEN** transactions or categories are loading and no cached data exists
- **THEN** skeleton blocks approximate the dashboard content areas
