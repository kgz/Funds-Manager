## ADDED Requirements

### Requirement: Planned spending page shell

The planned spending route SHALL use the OD flat page header: title "Planned spending", subtitle explaining global items and account filter behaviour, and a primary action to add a planned item.

#### Scenario: User opens planned spending

- **WHEN** the user navigates to `/planned`
- **THEN** the page displays a sticky flat header with title, subtitle, and "Add planned item" action

### Requirement: Planned spending period filters

The page SHALL provide preset/custom date range controls and a planned period selector consistent with existing behaviour.

#### Scenario: User changes period

- **WHEN** the user selects a different planned period or custom date range
- **THEN** the item list and planned total refresh for that range

### Requirement: Planned spending summary

The page SHALL show a planned total for the current filter scope using semantic money colours.

#### Scenario: Items in range

- **WHEN** planned items exist for the selected range
- **THEN** a planned total is displayed with appropriate danger/success styling for spending vs income

### Requirement: Planned spending match suggestions

When the API returns match suggestions, the page SHALL show a review callout with count, planned/transaction pairs, and link or dismiss actions.

#### Scenario: Match suggested

- **WHEN** a planned item may match an imported transaction
- **THEN** the user can link or dismiss without auto-applying

### Requirement: Planned spending table

The table SHALL list planned items with name, amount, date, category, notes, and row actions (link, edit, delete, mark complete when linked). Amounts SHALL use semantic money tokens.

#### Scenario: User edits item

- **WHEN** the user opens edit from a row
- **THEN** the add/edit modal opens with existing values
