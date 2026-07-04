## ADDED Requirements

### Requirement: Report coverage API

The API SHALL expose `GET /api/report-coverage/summary` with query params `start_date`, `end_date`, optional `account_id`.

#### Scenario: Get coverage

- **WHEN** client GETs with valid dates
- **THEN** response includes `sufficient`, `accounts`, and `summaryStatement`

#### Scenario: Invalid range

- **WHEN** `start_date` is after `end_date`
- **THEN** response is 400
