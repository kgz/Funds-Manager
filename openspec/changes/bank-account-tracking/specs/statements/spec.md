## MODIFIED Requirements

### Requirement: Statement fields
A statement SHALL have: `date`, `account_id` (parser account number), `financial_account_id` (FK), `opening_balance` (cents), `closing_balance` (cents), `created_at`, and optional `deleted_at` for soft-delete.

#### Scenario: New statement from PDF
- **WHEN** a Heritage PDF is successfully parsed
- **THEN** a statement row is inserted with `financial_account_id` set and opening balance from the parser

### Requirement: List active statements
`GET /api/statements` SHALL return all active statements, optionally filtered by `account_id` query param (financial account id).

#### Scenario: Filter by account
- **WHEN** client calls `GET /api/statements?account_id=3`
- **THEN** only statements for financial account 3 are returned
