## ADDED Requirements

### Requirement: Assets routes

The API SHALL expose CRUD endpoints under `/api/assets` as defined in the `assets` capability spec.

#### Scenario: Routes registered

- **WHEN** the server starts
- **THEN** `GET`, `POST`, `PUT`, and `DELETE` handlers for assets are available under `/api/assets`
