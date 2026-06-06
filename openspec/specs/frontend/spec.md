# Frontend

## Purpose
React 19 + TypeScript SPA for viewing and managing personal finance data.
## Requirements
### Requirement: Routes
The SPA SHALL provide these routes:

| Path | Page | Purpose |
|------|------|---------|
| `/` | Dashboard | Spending/income charts, category drill-down |
| `/transactions` | Transactions | Sortable table, category assignment |
| `/statements` | Statements | PDF upload, missing-period warnings |
| `/categories` | Categories | Category CRUD, hierarchy, colours |
| `/category_mapping/:id` | CategoryMappings | Per-category mapping rules |
| `/recurring` | Recurring | Recurring expense/income detection |
| `/breakdown` | Breakdown | Parent/subcategory spend by date range |
| `/settings` | Settings | Placeholder |

#### Scenario: Client-side routing
- **WHEN** user navigates to `/transactions`
- **THEN** the transactions page renders without a full server round-trip

### Requirement: State management
Application state SHALL use Redux Toolkit slices: statements, transactions, categories, mappings. A `transactionWatcherMiddleware` SHALL re-apply mapping rules client-side when transactions, categories, or mappings load.

#### Scenario: Client-side mapping overlay
- **WHEN** transactions and mappings are loaded
- **THEN** displayed `category_id` may reflect mapping rules even if the server value differs

#### Scenario: Overlay does not persist
- **WHEN** mapping overlay assigns a category in Redux
- **THEN** the server `category_id` is unchanged until user patches or recategorizes via API

### Requirement: API integration
The frontend SHALL fetch data via axios thunks (categories, mappings, transactions) and raw `fetch` for statement upload/delete. Dev proxy targets `VITE_API_PROXY_TARGET` (default `https://127.0.0.1:2020`).

#### Scenario: Statement upload
- **WHEN** user drops PDFs on the statements page
- **THEN** files are posted to `POST /api/statements` as multipart

### Requirement: Transactions page preferences
The transactions page SHALL persist `showUncategorizedOnly` filter in localStorage.

#### Scenario: Filter persistence
- **WHEN** user toggles uncategorized-only filter and reloads
- **THEN** the filter state is restored

### Requirement: Dashboard preferences
The dashboard SHALL persist `groupByParentCategory` in localStorage. Negative transaction amounts SHALL be treated as spending in charts.

#### Scenario: Parent grouping
- **WHEN** group-by-parent is enabled
- **THEN** pie chart aggregates subcategories under their parent

#### Scenario: Spending drill-down
- **WHEN** user clicks a pie segment
- **THEN** a sidebar shows transactions for that category group

### Requirement: Statements missing periods
The statements page SHALL detect gaps between consecutive statement months and from the last statement to the current month.

#### Scenario: Gap warning
- **WHEN** statements exist for Jan and Mar but not Feb
- **THEN** the UI warns about the missing February period

### Requirement: Recurring detection
Recurring expenses SHALL be detected client-side in `recurringExpenseDetection.ts` by grouping similar descriptions over time. No dedicated backend endpoint exists.

#### Scenario: Client-only recurring
- **WHEN** user views `/recurring`
- **THEN** patterns are computed from Redux transaction data in the browser

### Requirement: Theme
Light/dark theme preference SHALL be stored in localStorage and applied via `document.documentElement` class toggle.

#### Scenario: Theme persistence
- **WHEN** user switches theme
- **THEN** preference survives page reload

### Requirement: Production build embedding
Production frontend build (`pnpm build` in `frontend/`) SHALL output minified assets to `app/static/`. Release backend build requires `app/static/index.min.js` to exist.

#### Scenario: Release build gate
- **WHEN** `cargo build --release` runs for `app`
- **THEN** build fails if embedded static assets are missing

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

