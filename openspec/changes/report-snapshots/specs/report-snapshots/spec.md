## ADDED Requirements

### Requirement: Immutable broker report snapshot

The system SHALL persist broker report snapshots as immutable records. Each snapshot SHALL store `as_at`, analysis period (`start_date`, `end_date`), optional `account_id`, capture parameters, and a versioned JSON payload of computed broker figures.

#### Scenario: Create snapshot captures live data once

- **WHEN** client POSTs a valid snapshot request
- **THEN** the system computes income, lender expenses, serviceability, assets, liabilities, and net worth for the given period and stores them in `payload`
- **AND** subsequent reads return the stored payload without recomputation

#### Scenario: Snapshot cannot be updated

- **WHEN** a snapshot exists
- **THEN** no API endpoint modifies its payload or metadata after creation

### Requirement: Snapshot payload version

The stored payload SHALL include `version: 1` so future report renderers can migrate older snapshots.

#### Scenario: Version present on read

- **WHEN** client GETs a snapshot by id
- **THEN** the payload includes `version` equal to `1`

### Requirement: List and delete snapshots

The system SHALL list active (non-deleted) snapshots ordered by newest first. Users SHALL be able to soft-delete a snapshot.

#### Scenario: List excludes deleted

- **WHEN** client GETs `/api/report-snapshots`
- **THEN** only snapshots with `deleted_at` null are returned

#### Scenario: Delete soft-deletes

- **WHEN** client DELETEs a snapshot id
- **THEN** `deleted_at` is set and the snapshot no longer appears in list or GET

### Requirement: Reproducible read

Re-opening a saved snapshot SHALL reproduce identical numbers to those stored at capture time, regardless of later data changes.

#### Scenario: Live data changed after capture

- **WHEN** income or liabilities change after a snapshot was saved
- **THEN** GET of that snapshot still returns the original payload values
