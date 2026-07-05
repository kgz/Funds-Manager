## ADDED Requirements

### Requirement: Share link creation

The system SHALL allow creating a revocable share link for an active report snapshot with optional redaction settings.

#### Scenario: Create share

- **WHEN** client POSTs to `/api/report-snapshots/{id}/shares` with optional redaction JSON
- **THEN** a unique token is stored and the share URL path `/r/{token}` is returned

#### Scenario: Revoke share

- **WHEN** client DELETEs an active share
- **THEN** `revoked_at` is set and public fetch returns 404

### Requirement: Public report fetch

The system SHALL expose `GET /api/public/broker-reports/{token}` without authentication for non-revoked shares.

#### Scenario: Valid token

- **WHEN** client GETs with a valid non-revoked token
- **THEN** response includes snapshot metadata, frozen payload, annotations, redaction, and disclaimer

#### Scenario: Invalid or revoked token

- **WHEN** token is unknown or revoked
- **THEN** response is 404

### Requirement: Snapshot annotations

The system SHALL store annotations separately from the immutable snapshot payload.

#### Scenario: Add annotation

- **WHEN** client POSTs an annotation with `transaction_id`, `note`, and optional `exclude_from_analysis`
- **THEN** annotation is linked to the snapshot and returned on report fetch

#### Scenario: Delete annotation

- **WHEN** client DELETEs an annotation id
- **THEN** it no longer appears on report render

### Requirement: Redaction at render

Report rendering SHALL apply redaction rules from the share (or export form) without mutating stored payload.

#### Scenario: Hide merchant pattern

- **WHEN** redaction includes `hiddenMerchantPatterns`
- **THEN** matching income/expense labels are replaced with `[redacted]` in the rendered report only

### Requirement: Broker report disclaimer

Every rendered report (authenticated and public) SHALL include as-at date, analysis period, data source account names, and a not-financial-advice disclaimer.

#### Scenario: Footer present

- **WHEN** report is rendered
- **THEN** footer shows disclaimer and snapshot capture metadata
