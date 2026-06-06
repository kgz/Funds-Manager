## ADDED Requirements

### Requirement: Auth endpoints
The API SHALL expose:

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/register` | Create first user (bootstrap) |
| POST | `/api/login` | Authenticate and create session |
| POST | `/api/logout` | End session |
| GET | `/api/me` | Current user |

#### Scenario: Auth routes public
- **WHEN** client calls `POST /api/login` without a session
- **THEN** the request is processed (not rejected with 401)

## MODIFIED Requirements

### Requirement: Endpoint catalog
The API SHALL expose auth endpoints in addition to existing category, mapping, transaction, and statement routes. All data endpoints SHALL require authentication.

#### Scenario: Protected transactions
- **WHEN** unauthenticated client calls `GET /api/transactions`
- **THEN** HTTP 401 is returned
