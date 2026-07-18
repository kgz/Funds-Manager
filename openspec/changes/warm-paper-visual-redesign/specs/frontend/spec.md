## MODIFIED Requirements

### Requirement: Theme
The product SPA SHALL use the warm-paper visual system as the sole default theme. The app SHALL NOT require a light/dark theme toggle for normal use. Any leftover theme preference keys MAY be ignored.

#### Scenario: Default warm-paper
- **WHEN** the user loads the app with no special theme override
- **THEN** the UI renders in the warm-paper system (paper surfaces, ink text)

### Requirement: Chart card wrapper
Dashboard charts SHALL be rendered inside a consistent card container with rounded border, paper/panel surface, hairline border, and titled header aligned to warm-paper tokens.

#### Scenario: Visual consistency
- **WHEN** user views any chart on the dashboard
- **THEN** the chart sits inside the same card style as other dashboard panels

### Requirement: Chart theme for paper surfaces
Recharts axes, grids, and tick labels on the dashboard SHALL use colours tuned for light paper backgrounds (low-contrast grid, readable dark tick text).

#### Scenario: Grid visibility
- **WHEN** a chart with CartesianGrid renders on the dashboard
- **THEN** grid lines are subtle and do not overpower data series

### Requirement: Local app background
The application shell background SHALL NOT depend on external image URLs. It SHALL use CSS-only warm-paper styling (solid or subtle paper treatment).

#### Scenario: No external assets
- **WHEN** the app loads
- **THEN** the shell background does not depend on external texture URLs

### Requirement: Shared layout primitives
Primary pages SHALL use shared layout components from `frontend/src/components/layout/` (`PageShell`, `PageHeader`, `GlassCard`, `Modal`, `SegmentedControl`, layout tokens) for consistent spacing, typography, and warm-paper chrome.

#### Scenario: Page chrome consistency
- **WHEN** user navigates between dashboard, transactions, statements, categories, and breakdown
- **THEN** page titles, cards, buttons, and inputs follow the same warm-paper design tokens

### Requirement: Transactions category picker
The transactions page SHALL use a custom category dropdown with grouped parent/child options styled for warm-paper surfaces (opaque panel, dark readable text). The menu SHALL close when the page or table scrolls (not when scrolling inside the menu).

#### Scenario: Grouped options
- **WHEN** user opens the category picker on a transaction row
- **THEN** categories appear in grouped sections with colour dots on a light opaque menu

### Requirement: Breakdown table chrome
The breakdown category table SHALL be wrapped in `GlassCard` (paper panel surface) with sticky header styling consistent with other data tables. Text colours SHALL use the warm-paper token scale (dark ink / muted), not `text-white/*` dark-theme tokens.

#### Scenario: Card chrome
- **WHEN** the breakdown category table renders
- **THEN** it is wrapped in a panel card with a sticky header and warm-paper text tokens

## REMOVED Requirements

### Requirement: Dark chart theme
<!-- Removed: replaced by "Chart theme for paper surfaces" / warm-paper chart tokens. -->
