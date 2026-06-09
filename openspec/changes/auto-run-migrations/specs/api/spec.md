## MODIFIED Requirements

### Requirement: Database connection
The API SHALL connect to PostgreSQL via `DATABASE_URL` using Diesel. Migrations are embedded in the `database` crate.

#### Scenario: Pending migrations
- **WHEN** `run_pending_migrations()` is invoked
- **THEN** embedded SQL migrations in `database/migrations/` are applied

## ADDED Requirements

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
