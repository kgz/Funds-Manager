## Why

Funds Manager stores bank transactions and statement PDFs with no access control. Anyone who can reach the API can read or modify financial data. Login protects the app; encryption at rest limits exposure if the database or backups are compromised.

## What Changes

- User accounts with hashed passwords (Argon2)
- `POST /api/register`, `POST /api/login`, `POST /api/logout`, `GET /api/me`
- Session-based auth (HTTP-only cookie) on all `/api/*` routes except auth and OpenAPI
- Login page and route guards in the SPA
- Application-level encryption for sensitive fields (transaction descriptions, notes, statement PDF blobs/metadata) using a server-side key from `DATA_ENCRYPTION_KEY`
- One-time migration path to encrypt existing rows

## Capabilities

### New Capabilities

- `auth`: registration, login, logout, sessions, protected API access
- `data-encryption`: field-level encryption for sensitive financial data at rest

### Modified Capabilities

- `project`: replace "no authentication" with authenticated access requirement
- `api`: auth endpoints and middleware
- `frontend`: login shell and authenticated session handling

## Impact

- `database/migrations/` — `users` table (or revive legacy schema), optional `sessions`
- `database/src/models/`, encryption helpers
- `app/src/routes/` — auth handlers, auth middleware on API scopes
- `app/src/resources/environment.rs` — `DATA_ENCRYPTION_KEY`, session secret
- `frontend/src/pages/` — login page
- `frontend/src/` — auth state, axios/fetch credentials, protected routes

## Non-Goals

- OAuth / social login
- Multi-factor authentication
- Client-side encryption (browser holds no master key)
- Encrypting non-sensitive fields (category names, amounts, dates remain queryable)
