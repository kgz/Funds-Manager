## ADDED Requirements

### Requirement: Transaction notes endpoint
The API SHALL expose `PATCH /api/transactions/{id}/notes` under the `/api/transactions` scope.

#### Scenario: Route registered
- **WHEN** client calls `PATCH /api/transactions/42/notes`
- **THEN** the notes patch handler processes the request
