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
