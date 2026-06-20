## ADDED Requirements

### Requirement: Liabilities routes

The API SHALL expose CRUD endpoints under `/api/liabilities` as defined in the `liabilities` capability spec.

#### Scenario: Routes registered

- **WHEN** the server starts
- **THEN** `GET`, `POST`, `PUT`, and `DELETE` handlers for liabilities are available under `/api/liabilities`
