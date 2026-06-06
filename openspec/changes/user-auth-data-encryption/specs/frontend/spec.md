## ADDED Requirements

### Requirement: Login page
The SPA SHALL provide a `/login` route with email and password fields. Successful login SHALL redirect to the dashboard.

#### Scenario: Login success
- **WHEN** user submits valid credentials
- **THEN** user is redirected to `/` and can access protected routes

#### Scenario: Login failure
- **WHEN** user submits invalid credentials
- **THEN** an error message is shown and user remains on `/login`

### Requirement: Authenticated session
The frontend SHALL call `GET /api/me` on app load to establish session state. API requests SHALL include credentials (cookies).

#### Scenario: Session restore
- **WHEN** user reloads the page with a valid session cookie
- **THEN** user remains authenticated without re-entering password

### Requirement: Route protection
All routes except `/login` SHALL require authentication. Unauthenticated users SHALL be redirected to `/login`.

#### Scenario: Guard redirect
- **WHEN** unauthenticated user navigates to `/transactions`
- **THEN** user is redirected to `/login`
