## ADDED Requirements

### Requirement: User registration
The system SHALL allow creating the first user via `POST /api/register` with email and password when no users exist. Subsequent registration SHALL be rejected unless explicitly enabled by configuration.

#### Scenario: First user bootstrap
- **WHEN** no users exist and client posts valid email and password to `/api/register`
- **THEN** a user is created with an Argon2 password hash and HTTP 201 is returned

#### Scenario: Registration closed
- **WHEN** at least one user exists and registration is disabled
- **THEN** `POST /api/register` returns HTTP 403

### Requirement: User login
The system SHALL authenticate users via `POST /api/login` with email and password. On success, a session cookie SHALL be issued.

#### Scenario: Valid credentials
- **WHEN** client posts correct email and password
- **THEN** HTTP 200 is returned and a session cookie is set

#### Scenario: Invalid credentials
- **WHEN** client posts wrong password
- **THEN** HTTP 401 is returned and no session is created

### Requirement: User logout
`POST /api/logout` SHALL invalidate the current session and clear the session cookie.

#### Scenario: Logout
- **WHEN** an authenticated client calls `POST /api/logout`
- **THEN** subsequent API calls without a new login return HTTP 401

### Requirement: Current user
`GET /api/me` SHALL return the authenticated user's id and email.

#### Scenario: Authenticated me
- **WHEN** client has a valid session
- **THEN** `GET /api/me` returns user id and email

#### Scenario: Unauthenticated me
- **WHEN** client has no valid session
- **THEN** `GET /api/me` returns HTTP 401

### Requirement: Protected API access
All `/api/*` routes except login, register, and OpenAPI SHALL require a valid session.

#### Scenario: Unauthenticated API call
- **WHEN** client calls `GET /api/transactions` without a session
- **THEN** HTTP 401 is returned
