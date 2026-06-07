## ADDED Requirements

### Requirement: Multi-file upload stability
Processing multiple PDFs in a single `POST /api/statements` request SHALL use a shared database connection pool and SHALL batch-insert transactions per statement. The server MUST NOT open a fresh Postgres connection per query during import.

#### Scenario: Batch upload without crash
- **WHEN** user uploads several PDFs in one request
- **THEN** the server processes each file sequentially and returns per-file success or error without panicking
