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
The dashboard SHALL treat negative transaction amounts as spending in charts. Pie charts and spending drill-down SHALL aggregate by assigned `category_id` only, not parent category rollup.

#### Scenario: Chart by assigned category
- **WHEN** user views spending or income pie charts
- **THEN** each slice reflects the transaction's assigned `category_id`

#### Scenario: Spending drill-down
- **WHEN** user clicks a pie segment
- **THEN** a sidebar shows transactions for that assigned category group

### Requirement: Statement re-import confirmation
Before replacing an existing statement period, the statements page SHALL show a confirmation dialog listing affected account and month. Cancel MUST leave existing data unchanged.

#### Scenario: User cancels replace
- **WHEN** upload preview reports a conflict and the user clicks Cancel
- **THEN** no statement or transaction data is modified

#### Scenario: User confirms replace
- **WHEN** the user confirms Replace after a conflict warning
- **THEN** the import proceeds with `replace=true`

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

### Requirement: Local app background
The application shell background SHALL NOT depend on external image URLs. It SHALL use CSS-only styling (gradient or subtle pattern).

#### Scenario: No external assets
- **WHEN** the app loads without network access to image CDNs
- **THEN** the background still renders correctly

### Requirement: Dashboard KPI summary row
The dashboard SHALL display a row of summary cards above charts showing current balance, total spending, total income, and net savings for the selected period.

#### Scenario: KPI values from analytics
- **WHEN** dashboard analytics are loaded
- **THEN** summary cards show computed dollar amounts with consistent currency formatting

#### Scenario: No transactions
- **WHEN** no data exists for the selected period
- **THEN** summary cards show placeholder or zero values without error

### Requirement: Dashboard date range filter
The dashboard SHALL provide a period selector (this month, rolling 3/6/12 months, all time). All dashboard charts and summary metrics SHALL respect the selected period via server-side date filtering.

#### Scenario: Filter charts
- **WHEN** user selects a period
- **THEN** pie, bar, line charts and KPI cards only include data from that range

#### Scenario: Persist selection
- **WHEN** user changes the period and reloads the page
- **THEN** the previously selected period is restored from localStorage

### Requirement: Dashboard section order
The dashboard SHALL render sections in this order: sticky period header, summary KPIs, monthly profit/loss bar chart, spending and income pie charts, then balance over time line chart.

#### Scenario: Visual hierarchy
- **WHEN** user opens the dashboard on a large screen
- **THEN** monthly trends appear above category pie charts

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

### Requirement: Balance chart clarity
The balance-over-time chart SHALL display a linear regression trend line alongside the balance series. Min, max, and horizontal average reference lines MUST NOT be shown.

#### Scenario: Trend overlay
- **WHEN** user views the balance chart with data
- **THEN** the balance line and dashed trend line are visible

### Requirement: Data table column sorting
Pages using the shared `Table` component with `sortable` columns SHALL wire `sortState` and `onSortChange` so clicking column headers re-orders visible rows.

#### Scenario: Header click sorts
- **WHEN** user clicks a sortable column header on `/transactions` or `/statements`
- **THEN** rows reorder by that column and a direction indicator appears on the header

#### Scenario: Toggle direction
- **WHEN** user clicks the same column header again
- **THEN** sort direction toggles between ascending and descending

### Requirement: Default sort latest first
`/transactions` and `/statements` tables SHALL default to sorting by date descending (newest first) on initial load.

#### Scenario: Transactions default
- **WHEN** user opens `/transactions` without changing sort
- **THEN** rows appear with the most recent `transaction_date` first

#### Scenario: Statements default
- **WHEN** user opens `/statements` without changing sort
- **THEN** rows appear with the most recent statement `date` first

#### Scenario: Default indicator visible
- **WHEN** page loads with default sort
- **THEN** the date column header shows descending sort indicator

