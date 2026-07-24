### Requirement: Transactions page chrome

The `/transactions` page SHALL use warm-paper flat header, filter toolbar, and panel-wrapped data table aligned with `funds-transactions.html`.

#### Scenario: Header and actions
- **WHEN** user opens Transactions
- **THEN** the page shows a flat title, account context subtitle, and recategorize / new-category actions in the header row

#### Scenario: Filter toolbar
- **WHEN** user views the transactions panel
- **THEN** account filter, search, all/uncategorized segmented control, and hide-transfers switch appear in one toolbar row

#### Scenario: Table presentation
- **WHEN** transactions render in the table
- **THEN** amounts use semantic warm-paper colours, status uses pill styling, and row checkboxes use accent styling (not dark gray)
