# API

## Purpose
HTTP API served by Actix Web (`server_v2`) on port 2020 by default.
## Requirements
### Requirement: API base path
All JSON API routes SHALL be mounted under `/api`.

#### Scenario: Route prefix
- **WHEN** a client calls category endpoints
- **THEN** paths are `/api/categories`, not `/categories`

### Requirement: Endpoint catalog
The API SHALL expose:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/openapi.json` | OpenAPI document |
| POST | `/api/categories` | Create category |
| GET | `/api/categories` | List categories |
| GET | `/api/categories/{id}` | Get category |
| PUT | `/api/categories/{id}` | Update category |
| DELETE | `/api/categories/{id}` | Soft-delete category |
| PUT | `/api/categories/{id}/undelete` | Restore category |
| GET | `/api/category_mappings` | List mappings |
| POST | `/api/category_mappings` | Create mapping |
| GET | `/api/category_mappings/{id}` | Mappings by category_id |
| PUT | `/api/category_mappings/{id}` | Update mapping by mapping id |
| DELETE | `/api/category_mappings/{id}` | Delete mapping by mapping id |
| GET | `/api/transactions` | List transactions |
| PATCH | `/api/transactions/{id}/category` | Set transaction category |
| POST | `/api/transactions/recategorize-uncategorized` | Bulk recategorize |
| POST | `/api/statements` | Upload PDF(s) |
| GET | `/api/statements` | List active statements |
| DELETE | `/api/statements/{id}` | Soft-delete statement |
| GET | `/api/planned-spending` | List planned spending |
| POST | `/api/planned-spending` | Create planned item |
| PUT | `/api/planned-spending/{id}` | Update planned item |
| DELETE | `/api/planned-spending/{id}` | Soft-delete planned item |

#### Scenario: OpenAPI available
- **WHEN** client requests `GET /api/openapi.json`
- **THEN** a utoipa-generated OpenAPI JSON document is returned

### Requirement: SPA and static routes
Non-API GET routes SHALL serve the React SPA. `GET /static/*` serves embedded production assets. `GET /test` serves ReDoc API docs.

#### Scenario: SPA fallback
- **WHEN** a GET request does not match an API or static route
- **THEN** the index HTML shell is returned for client-side routing

### Requirement: CORS
The server SHALL allow CORS from localhost and 127.0.0.1 on ports 2020 and 3000 (http and https). Additional origins MAY be set via `CORS_ORIGINS`.

#### Scenario: Vite dev proxy
- **WHEN** the frontend dev server on port 3000 calls the API
- **THEN** CORS headers allow the request

### Requirement: Transport by environment
In DEV (debug builds), the server SHALL bind with HTTPS (rustls) using `CERT_PATH` and `KEY_PATH`. In PROD (release builds), the server SHALL bind with plain HTTP.

#### Scenario: Dev HTTPS
- **WHEN** running `cargo run` in debug without certs configured
- **THEN** startup panics requiring `CERT_PATH` and `KEY_PATH`

### Requirement: Database connection
The API SHALL connect to PostgreSQL via `DATABASE_URL` using Diesel. Migrations are embedded in the `database` crate.

#### Scenario: Pending migrations
- **WHEN** `run_pending_migrations()` is invoked
- **THEN** embedded SQL migrations in `database/migrations/` are applied

### Requirement: Startup migrations
The server SHALL run pending embedded migrations on startup before accepting HTTP connections. If migration fails, the process SHALL log the error and exit with a non-zero status.

#### Scenario: Fresh database
- **WHEN** the server starts against an empty Postgres database
- **THEN** all embedded migrations are applied automatically

#### Scenario: Pending migration on upgrade
- **WHEN** the server starts and new migrations exist since the last deploy
- **THEN** only pending migrations are applied

#### Scenario: Migration failure
- **WHEN** a migration fails during startup
- **THEN** the server does not bind or serve HTTP traffic

#### Scenario: Manual migrate still available
- **WHEN** an operator runs `cargo run --bin migrate` in `database/`
- **THEN** pending migrations are applied without starting the HTTP server

### Requirement: Planned spending routes

The API SHALL expose CRUD endpoints under `/api/planned-spending` as defined in the `planned-spending` capability spec.

#### Scenario: Routes registered

- **WHEN** the server starts
- **THEN** `GET`, `POST`, `PUT`, and `DELETE` handlers for planned spending are available under `/api/planned-spending`

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

### Requirement: Liabilities routes

The API SHALL expose CRUD endpoints under `/api/liabilities` as defined in the `liabilities` capability spec.

#### Scenario: Routes registered

- **WHEN** the server starts
- **THEN** `GET`, `POST`, `PUT`, and `DELETE` handlers for liabilities are available under `/api/liabilities`

