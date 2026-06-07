## ADDED Requirements

### Requirement: Shared layout primitives
Primary pages SHALL use shared layout components from `frontend/src/components/layout/` (`PageShell`, `PageHeader`, `GlassCard`, `Modal`, `SegmentedControl`, layout tokens) for consistent spacing, typography, and dark-theme chrome.

#### Scenario: Page chrome consistency
- **WHEN** user navigates between dashboard, transactions, statements, and categories
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
