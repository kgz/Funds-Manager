# Deployment

## Purpose
Local development and production runtime configuration.

## Requirements

### Requirement: MySQL via Docker
MySQL 8.0 SHALL be runnable via `docker-compose.yml` in `app/` or `database/`, mapping host port **3308** to container 3306. Data directory is `MYSQL_DATA_DIR` or `./mysql`.

#### Scenario: Local database
- **WHEN** docker compose is started
- **THEN** MySQL is reachable at `localhost:3308`

### Requirement: Backend environment variables
The backend SHALL read configuration from environment variables: `DATABASE_URL` (required), `SERVER_PORT` (default 2020), `CERT_PATH` and `KEY_PATH` (required in dev), `CORS_ORIGINS`, `PDFIUM_LIBRARY_PATH`, and `VITE_DEV_SERVER_ORIGIN`.

#### Scenario: Database connection required
- **WHEN** the backend starts without `DATABASE_URL`
- **THEN** database connection fails at runtime

#### Scenario: Default port conflict
- **WHEN** port 2020 is already in use (e.g. Docker API container)
- **THEN** operator must stop the conflicting process or set `SERVER_PORT` to another value

### Requirement: Frontend environment variables
The frontend dev server SHALL support `VITE_PORT` (default 3000), `VITE_API_PROXY_TARGET` (default `https://127.0.0.1:2020`), optional `VITE_HTTPS_KEY_PATH` and `VITE_HTTPS_CERT_PATH`, and `VITE_BASE` for production asset paths.

#### Scenario: Dev workflow
- **WHEN** developing locally
- **THEN** Vite runs on ~3000, proxies `/api` to backend on ~2020

### Requirement: Dev vs prod serving
Debug builds SHALL load Vite HMR from `VITE_DEV_SERVER_ORIGIN`. Release builds SHALL serve embedded `index.min.js` and `index.min.css` from `app/static/`.

#### Scenario: Production single binary
- **WHEN** release server starts
- **THEN** frontend and API are served from the same Actix process on one port

### Requirement: Cargo watch development
Backend development SHALL support `cargo watch -c -w . -x run` from `app/` for auto-reload on source changes.

#### Scenario: Hot reload backend
- **WHEN** Rust source changes during `cargo watch`
- **THEN** the server recompiles and restarts
