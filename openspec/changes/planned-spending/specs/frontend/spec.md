## ADDED Requirements

### Requirement: Planned spending page

The SPA SHALL provide `/planned` to list, create, edit, and delete planned spending items.

#### Scenario: Nav entry

- **WHEN** user views the sidebar
- **THEN** a link to **Planned spending** is visible under General

#### Scenario: Period filter and total

- **WHEN** user selects a month or custom date range on `/planned`
- **THEN** the table shows overlapping items and a summary displays the planned total for that period

#### Scenario: Create item

- **WHEN** user submits the add form with name, amount, and start date
- **THEN** the item appears in the list without a full page reload

#### Scenario: Edit item

- **WHEN** user edits an existing item and saves
- **THEN** the list reflects the updated values

#### Scenario: Delete item

- **WHEN** user confirms delete on an item
- **THEN** the item is removed from the list

### Requirement: Planned spending form fields

The add/edit form SHALL include: name, amount (currency input), start date, optional end date, optional category picker, optional notes.

#### Scenario: Category optional

- **WHEN** user saves without selecting a category
- **THEN** the item is stored with no category
