## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Shared layout primitives
Primary pages SHALL use shared layout components from `frontend/src/components/layout/` (`PageShell`, `PageHeader`, `GlassCard`, `Modal`, `SegmentedControl`, layout tokens) for consistent spacing, typography, and dark-theme chrome.

#### Scenario: Page chrome consistency
- **WHEN** user navigates between dashboard, transactions, statements, categories, and breakdown
- **THEN** page titles, cards, buttons, and inputs follow the same design tokens
