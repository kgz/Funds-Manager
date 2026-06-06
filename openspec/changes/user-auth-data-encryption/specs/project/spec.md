## MODIFIED Requirements

### Requirement: Authentication required
The system SHALL enforce authentication on all `/api/*` data routes. Login, register, logout, and OpenAPI discovery endpoints SHALL remain public.

#### Scenario: Unauthenticated API access denied
- **WHEN** a client calls `GET /api/categories` without a valid session
- **THEN** HTTP 401 is returned

#### Scenario: Authenticated API access
- **WHEN** a client calls `GET /api/categories` with a valid session
- **THEN** the request is processed
