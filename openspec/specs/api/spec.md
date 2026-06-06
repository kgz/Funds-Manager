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
The API SHALL connect to MySQL via `DATABASE_URL` using Diesel. Migrations are embedded in the `database` crate.

#### Scenario: Pending migrations
- **WHEN** `run_pending_migrations()` is invoked
- **THEN** embedded SQL migrations in `database/migrations/` are applied
