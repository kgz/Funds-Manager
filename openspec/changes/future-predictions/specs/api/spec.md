## ADDED Requirements

### Requirement: Baseline prediction API

`GET /api/predictions/baseline` SHALL accept `from`, `to` (ISO dates), and optional `account_id`. It SHALL return monthly projected balance points for the baseline path and metadata describing inputs used.

#### Scenario: Monthly series

- **WHEN** valid `from` and `to` are provided
- **THEN** the response includes an array of `{ month, balance_cents }` points

#### Scenario: Planned spending included

- **WHEN** planned spending items fall within the horizon
- **THEN** their amounts are reflected in the baseline projection

### Requirement: Scenario CRUD

The API SHALL expose CRUD for prediction scenarios and nested adjustment lines under `/api/prediction-scenarios`.

#### Scenario: List scenarios

- **WHEN** `GET /api/prediction-scenarios` is called
- **THEN** active scenarios with their lines are returned

#### Scenario: Create scenario with lines

- **WHEN** `POST /api/prediction-scenarios` includes lines
- **THEN** the scenario and lines are stored and returned

### Requirement: Goal CRUD

The API SHALL expose CRUD for prediction goals under `/api/prediction-goals`.

#### Scenario: Create goal

- **WHEN** `POST /api/prediction-goals` includes `target_amount_cents` and `target_date`
- **THEN** the goal is stored and returned

#### Scenario: Soft delete

- **WHEN** `DELETE /api/prediction-goals/{id}` is called
- **THEN** the goal is soft-deleted and omitted from list responses

### Requirement: Scenario projection

`GET /api/predictions/scenario/{id}` SHALL return monthly projected balance points for a scenario (baseline plus line effects) for the requested `from`/`to` range.

#### Scenario: Compare scenario

- **WHEN** a scenario id and date range are provided
- **THEN** the response includes monthly points suitable for chart overlay
