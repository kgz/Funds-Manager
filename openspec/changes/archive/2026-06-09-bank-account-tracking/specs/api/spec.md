## ADDED Requirements

### Requirement: Financial accounts endpoints
The API SHALL expose:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/accounts` | List financial accounts |
| POST | `/api/accounts` | Create account |
| PUT | `/api/accounts/{id}` | Update account |
| DELETE | `/api/accounts/{id}` | Soft-delete account |

#### Scenario: Accounts route prefix
- **WHEN** client calls `GET /api/accounts`
- **THEN** financial account records are returned

### Requirement: Account filter query params
`GET /api/statements` and `GET /api/transactions` SHALL accept optional `account_id` (financial account primary key) to scope results.

#### Scenario: Combined list and filter
- **WHEN** client calls `GET /api/transactions?account_id=1`
- **THEN** only transactions for that account are returned
