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
| `/planned` | Planned spending | Upcoming expenses and income |
| `/lender-expenses` | Living expenses | Lender bucket summary and category mapping |
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

### Requirement: Shared layout primitives
Primary pages SHALL use shared layout components from `frontend/src/components/layout/` (`PageShell`, `PageHeader`, `GlassCard`, `Modal`, `SegmentedControl`, layout tokens) for consistent spacing, typography, and dark-theme chrome.

#### Scenario: Page chrome consistency
- **WHEN** user navigates between dashboard, transactions, statements, categories, and breakdown
- **THEN** page titles, cards, buttons, and inputs follow the same design tokens

### Requirement: Transactions category picker
The transactions page SHALL use a custom dark-themed category dropdown with grouped parent/child options. The menu SHALL use an opaque background, light text, and close when the page or table scrolls (not when scrolling inside the menu).

#### Scenario: Grouped options
- **WHEN** user opens the category picker on a transaction row
- **THEN** categories appear in grouped sections with colour dots

### Requirement: Category suggestions on transactions
Uncategorized transactions MAY show a server-suggested category with an explicit **Apply** action. Categorized transactions SHALL NOT show suggestion UI.

#### Scenario: Apply suggestion
- **WHEN** user clicks Apply on a suggested category
- **THEN** the transaction is patched with that category via the API

#### Scenario: No suggestion when categorized
- **WHEN** a transaction already has a category
- **THEN** only the category picker is shown

### Requirement: Transactions filter control
The uncategorized-only filter on `/transactions` SHALL use a segmented control (`All` | `Uncategorized`), not a checkbox.

#### Scenario: Segmented filter
- **WHEN** user selects Uncategorized
- **THEN** only uncategorized transactions are listed

### Requirement: Breakdown period filter
The `/breakdown` page SHALL provide dashboard-style period presets (`This month`, `3 months`, `6 months`, `1 year`) via `PeriodFilter`, plus a **Presets | Custom** segmented control. Custom mode SHALL show inline from/to date inputs. Selection SHALL persist in localStorage.

#### Scenario: Preset period
- **WHEN** user selects a preset period on `/breakdown`
- **THEN** analytics reload for that date range

#### Scenario: Custom range
- **WHEN** user switches to Custom and picks from/to dates
- **THEN** analytics reload for the custom range

#### Scenario: Persisted range
- **WHEN** user reloads `/breakdown`
- **THEN** the last preset or custom range is restored

### Requirement: Breakdown summary cards
The `/breakdown` page SHALL display `StatCard` summaries for period spending, period income, and net (income minus spending) for the selected range.

#### Scenario: Totals update
- **WHEN** breakdown data loads for a range
- **THEN** summary cards show formatted currency totals for that range

### Requirement: Breakdown page states
The `/breakdown` page SHALL use shared layout states: full-page loading on first load, `ErrorState` with retry on fetch failure, `EmptyState` when no transactions exist in range, and `InlineAlert` for invalid date ranges.

#### Scenario: Empty range
- **WHEN** no transactions exist in the selected period
- **THEN** an empty state is shown instead of a bare table message

#### Scenario: Invalid range
- **WHEN** from date is after to date
- **THEN** a warning alert is shown and the table is hidden

### Requirement: Breakdown table chrome
The breakdown category table SHALL be wrapped in `GlassCard` with sticky header styling consistent with other data tables. Text colours SHALL use the dark-theme token scale (`text-white/*`).

#### Scenario: Card chrome
- **WHEN** the breakdown category table renders
- **THEN** it is wrapped in a `GlassCard` with a sticky header and dark-theme text tokens

### Requirement: Living expenses page

The app SHALL provide route `/lender-expenses` with nav label **Living expenses** under the Cash flow sidebar section.

The page SHALL have sub-routes: **Monthly summary** (`/lender-expenses`) and **Category mapping** (`/lender-expenses/mappings`). Category mapping SHALL be a full page with search and table layout, not a modal.

#### Scenario: Period filter
- **WHEN** user selects a dashboard period on the summary tab
- **THEN** summary reloads for that date range

#### Scenario: Edit mapping
- **WHEN** user changes a category's lender bucket on the mapping page and saves
- **THEN** summary reflects the new mapping on reload

#### Scenario: Bucket drill-down
- **WHEN** user expands a lender bucket row on the summary tab
- **THEN** contributing app categories and amounts are loaded for that bucket

### Requirement: Planned spending page
The SPA SHALL provide `/planned` to list, create, edit, and delete planned spending items.

#### Scenario: Nav entry
- **WHEN** user views the sidebar
- **THEN** a link to **Planned spending** is visible under General

#### Scenario: Period filter and total
- **WHEN** user selects a period or custom date range on `/planned`
- **THEN** the table shows matching items and a summary displays the planned total for that period

#### Scenario: Create item
- **WHEN** user submits the add form with name, amount, and date
- **THEN** the item appears in the list without a full page reload

#### Scenario: Edit item
- **WHEN** user edits an existing item and saves
- **THEN** the list reflects the updated values

#### Scenario: Delete item
- **WHEN** user confirms delete on an item
- **THEN** the item is removed from the list

### Requirement: Planned spending form fields
The add/edit form SHALL include: name, amount with spending/income toggle, date, optional searchable category picker, optional notes.

#### Scenario: Single date in v1
- **WHEN** user creates or edits a planned item
- **THEN** the form exposes one date field (stored as `start_date`; `end_date` remains null)

#### Scenario: Category optional
- **WHEN** user saves without selecting a category
- **THEN** the item is stored with no category

### Requirement: Future predictions page

The SPA SHALL provide `/predictions` showing a forward balance chart, baseline explanation, scenarios, and goals.

#### Scenario: Nav entry

- **WHEN** user views the sidebar
- **THEN** a link to **Future predictions** is visible under General

#### Scenario: Horizon selection

- **WHEN** user selects 3, 6, or 12 months forward or a custom end date
- **THEN** the chart and goal calculations use that horizon

### Requirement: Baseline forecast display

The page SHALL show a baseline projected balance line with plain-language summary text (no internal jargon such as "heuristic").

#### Scenario: Baseline inputs

- **WHEN** the page loads
- **THEN** the baseline incorporates current balance trend, planned spending in range, and repeat payment patterns available to the client

#### Scenario: Account filter

- **WHEN** a single account is selected in the global account filter
- **THEN** the baseline uses that account scope for balance and history

### Requirement: Scenario comparison

Users SHALL create named scenarios with one or more adjustment lines and compare selected scenarios against the baseline on the same chart.

#### Scenario: Add scenario

- **WHEN** user creates a scenario with adjustment lines
- **THEN** it is persisted and appears in the scenario list

#### Scenario: Toggle scenario on chart

- **WHEN** user enables a scenario for comparison
- **THEN** its projected line appears alongside the baseline

### Requirement: Savings goals

Users SHALL add goals with a target balance amount and target date.

#### Scenario: Goal gap

- **WHEN** a goal is saved
- **THEN** the UI shows projected balance at the target date, the gap to the target, and a suggested monthly amount to close the gap when the gap is positive

#### Scenario: Plain labels

- **WHEN** goal or scenario copy is shown
- **THEN** labels use everyday language (e.g. "Projected balance", "Shortfall", "Save about $X/month")

### Requirement: Liabilities page

The SPA SHALL provide `/liabilities` to list, create, edit, and delete liabilities, with a nav entry under General.

#### Scenario: Nav entry
- **WHEN** the user views the sidebar
- **THEN** a link to **Liabilities** is visible under General

#### Scenario: Total owed
- **WHEN** liabilities exist
- **THEN** the page shows the total outstanding balance across all liabilities

### Requirement: Liability form fields

The add/edit form SHALL include: name, kind, optional lender, current balance, optional credit limit, optional original amount, optional interest rate, optional rate type, optional repayment amount and frequency, optional term, optional linked financial account, and optional notes.

#### Scenario: Create
- **WHEN** the user submits the form with name, kind, and balance
- **THEN** the liability appears in the list without a full page reload

#### Scenario: Edit
- **WHEN** the user edits an existing liability and saves
- **THEN** the list reflects the updated values

### Requirement: Assets page

The SPA SHALL provide `/assets` to list, create, edit, and delete assets and external balances, with a nav entry under General.

#### Scenario: Nav entry
- **WHEN** the user views the sidebar
- **THEN** a link to **Assets** is visible under General

#### Scenario: Total value
- **WHEN** assets exist
- **THEN** the page shows the total value across all assets

#### Scenario: Stale valuation
- **WHEN** an asset's `valued_at` is null or older than 12 months
- **THEN** the row shows a stale-valuation indicator

### Requirement: Asset form fields

The add/edit form SHALL include: name, kind, value, optional valuation date and source, optional linked liability, and optional notes.

#### Scenario: Create
- **WHEN** the user submits the form with name, kind, and value
- **THEN** the asset appears in the list without a full page reload

### Requirement: Net worth chart

The dashboard SHALL display a net-worth-over-time chart driven by `GET /api/analytics/net-worth`, using the existing period selector and account filter.

#### Scenario: Renders trend
- **WHEN** net worth data exists for the selected range
- **THEN** the dashboard shows a net worth trend line with a currency y-axis

#### Scenario: Account filter
- **WHEN** the user changes the account filter
- **THEN** the chart updates without a full page reload

#### Scenario: Empty state
- **WHEN** no balance history exists for the range
- **THEN** the chart shows an empty/insufficient-data state

### Requirement: Accounts page shows last known balance

The Accounts page SHALL display **Last balance** and **As at** columns for each account when stats are loaded.

- **Last balance**: formatted currency, or em dash when null
- **As at**: formatted date from `lastKnownBalanceDate`, or em dash when null

Values SHALL match the account-scoped dashboard balance for “All time” when transaction history exists.

#### Scenario: Balance displayed
- **WHEN** stats are loaded and `lastKnownBalance` is present
- **THEN** the Accounts table shows formatted currency in **Last balance** and a formatted date in **As at**

#### Scenario: No balance history
- **WHEN** `lastKnownBalance` is null
- **THEN** both columns show an em dash

### Requirement: Income page

The app SHALL provide an Income page listing detected streams with edit for label, primary, confirmed, and optional gross monthly.

#### Scenario: Edit stream

- **WHEN** the user saves profile changes
- **THEN** subsequent summary responses reflect the updated labels and flags

