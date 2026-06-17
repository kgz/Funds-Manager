## ADDED Requirements

### Requirement: Planned spending routes

The API SHALL expose CRUD endpoints under `/api/planned-spending` as defined in the `planned-spending` capability spec.

#### Scenario: Routes registered

- **WHEN** the server starts
- **THEN** `GET`, `POST`, `PUT`, and `DELETE` handlers for planned spending are available under `/api/planned-spending`
