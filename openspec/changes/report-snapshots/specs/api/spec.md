## ADDED Requirements

### Requirement: Report snapshot API

The API SHALL expose broker report snapshot endpoints under `/api/report-snapshots`.

#### Scenario: List snapshots

- **WHEN** client GETs `/api/report-snapshots`
- **THEN** response is JSON array of metadata: `id`, `name`, `asAt`, `startDate`, `endDate`, `accountId`, `rateBufferBps`, `createdAt`

#### Scenario: Get snapshot

- **WHEN** client GETs `/api/report-snapshots/{id}` for an active snapshot
- **THEN** response includes metadata plus `payload` object

#### Scenario: Create snapshot

- **WHEN** client POSTs `/api/report-snapshots` with `name`, `asAt`, `startDate`, `endDate`, and optional `accountId`, `rateBufferBps`, `minOccurrences`
- **THEN** response `201` includes the new snapshot with full payload

#### Scenario: Delete snapshot

- **WHEN** client DELETEs `/api/report-snapshots/{id}`
- **THEN** response is `204` and the snapshot is soft-deleted

#### Scenario: Not found

- **WHEN** client GETs or DELETEs a missing or deleted snapshot id
- **THEN** response is `404`
