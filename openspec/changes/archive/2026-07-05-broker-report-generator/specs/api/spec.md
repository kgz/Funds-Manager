## ADDED Requirements

### Requirement: Broker report API

The API SHALL expose share and annotation endpoints for report snapshots and a public fetch route by token.

#### Scenario: List shares

- **WHEN** client GETs `/api/report-snapshots/{id}/shares`
- **THEN** active shares for that snapshot are returned

#### Scenario: List annotations

- **WHEN** client GETs `/api/report-snapshots/{id}/annotations`
- **THEN** non-deleted annotations for that snapshot are returned

#### Scenario: Snapshot not found

- **WHEN** client requests shares or annotations for a missing or deleted snapshot
- **THEN** response is 404
