## ADDED Requirements

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
