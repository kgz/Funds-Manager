## ADDED Requirements

### Requirement: Chart card wrapper
Dashboard charts SHALL be rendered inside a consistent card container with rounded border, subtle background, and titled header.

#### Scenario: Visual consistency
- **WHEN** user views any chart on the dashboard
- **THEN** the chart sits inside the same card style as the spending breakdown sidebar panels

### Requirement: Dark chart theme
Recharts axes, grids, and tick labels on the dashboard SHALL use colours tuned for the dark background (low-contrast grid, readable tick text).

#### Scenario: Grid visibility
- **WHEN** a chart with CartesianGrid renders on the dashboard
- **THEN** grid lines are subtle and do not overpower data series
