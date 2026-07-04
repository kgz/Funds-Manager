## ADDED Requirements

### Requirement: Coverage on report snapshots

The report snapshots page SHALL show coverage for the selected period and warn before saving when coverage is insufficient.

#### Scenario: Show coverage

- **WHEN** user selects a period on `/report-snapshots`
- **THEN** coverage summary and any gap months are displayed

#### Scenario: Warn on save

- **WHEN** user saves a snapshot with insufficient coverage
- **THEN** a confirmation is required before capture proceeds

#### Scenario: Snapshot detail

- **WHEN** user opens a saved snapshot
- **THEN** stored coverage from the payload is shown read-only
