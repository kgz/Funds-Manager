## ADDED Requirements

### Requirement: Print-ready broker report page

The app SHALL provide a print-ready broker report view rendered from a snapshot payload.

#### Scenario: Open from snapshot

- **WHEN** user opens report from snapshot detail
- **THEN** all payload sections render with net worth chart and coverage warning when insufficient

#### Scenario: Print export

- **WHEN** user chooses Print / Save PDF
- **THEN** browser print uses print stylesheet that hides app chrome and formats sections for A4

### Requirement: Share link UI

The report page SHALL let users configure redaction, create a share link, copy the URL, and revoke existing links.

#### Scenario: Copy share URL

- **WHEN** user creates a share with redaction options
- **THEN** full `/r/{token}` URL is copyable

### Requirement: Public report route

The app SHALL serve `/r/:token` as a read-only report without sidebar navigation.

#### Scenario: Public view

- **WHEN** visitor opens a valid share URL
- **THEN** report renders from public API with redaction applied

#### Scenario: Invalid token

- **WHEN** token is invalid or revoked
- **THEN** a not-found message is shown

### Requirement: Annotation UI

Snapshot report flow SHALL allow adding and removing annotations explaining one-off transactions.

#### Scenario: Annotate transaction

- **WHEN** user adds an annotation with note and exclude flag
- **THEN** annotation appears in the report annotations section
