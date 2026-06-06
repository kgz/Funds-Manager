# Project

## Purpose
Personal finance application for importing bank statement PDFs, storing transactions, categorizing spending, and visualizing finances.

## Requirements

### Requirement: Workspace structure
The system SHALL be organized as a Cargo workspace with backend (`app/`), database layer (`database/`), and parser crates (`crates/statement-parser`, `crates/statement-parser-cli`). The frontend SHALL live in `frontend/` as a separate React/Vite project.

#### Scenario: Backend serves API and SPA
- **WHEN** the backend starts in production
- **THEN** it serves the embedded frontend from `app/static/` and exposes REST endpoints under `/api`

#### Scenario: Development uses split servers
- **WHEN** the backend runs in debug mode
- **THEN** the HTML shell loads the Vite dev server (default `https://localhost:3000`) and API requests are proxied to the backend

### Requirement: Money stored as integer cents
All monetary values in the database (statement balances, transaction amounts, transaction balances) SHALL be stored as signed integers representing cents.

#### Scenario: Import persists cents
- **WHEN** a statement PDF is parsed
- **THEN** opening balance, closing balance, transaction amounts, and running balances are persisted as cent integers

### Requirement: No authentication
The system currently SHALL NOT enforce authentication on API routes. Login endpoints and session middleware are not active.

#### Scenario: Unauthenticated API access
- **WHEN** a client calls any `/api/*` endpoint
- **THEN** the request is processed without credential checks
