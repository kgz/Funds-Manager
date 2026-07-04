## ADDED Requirements

### Requirement: Report snapshots page

The app SHALL provide a `/report-snapshots` page to list saved snapshots, create a new snapshot, and delete existing ones.

#### Scenario: List snapshots

- **WHEN** user opens `/report-snapshots`
- **THEN** saved snapshots appear with name, as-at date, period, and created date

#### Scenario: Save snapshot

- **WHEN** user submits the save form with name and period
- **THEN** a snapshot is created via POST and the list refreshes

#### Scenario: Delete snapshot

- **WHEN** user confirms delete on a snapshot
- **THEN** the snapshot is removed from the list after DELETE succeeds

### Requirement: Snapshot detail view

The app SHALL provide `/report-snapshots/:id` rendering read-only figures from the stored payload, not live APIs.

#### Scenario: View saved snapshot

- **WHEN** user opens a snapshot detail link
- **THEN** serviceability surplus figures and key register totals match the stored payload

#### Scenario: Navigation

- **WHEN** user views the sidebar
- **THEN** **Report snapshots** appears under Cash flow after Serviceability
