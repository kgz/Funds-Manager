## ADDED Requirements

### Requirement: Financial account fields
A financial account SHALL have: `bank_name`, `display_name`, `account_number` (parser-derived id), `parser_name`, optional `account_type`, `created_at`, and optional `deleted_at`.

#### Scenario: Auto-created on import
- **WHEN** a PDF is imported for parser `heritage` and account number `102049120` and no matching account exists
- **THEN** a financial account is created and linked to the new statement

#### Scenario: Unique parser and account number
- **WHEN** two imports share the same `parser_name` and `account_number`
- **THEN** they link to the same financial account

### Requirement: Account management API
The API SHALL expose `GET`, `POST`, `PUT`, and `DELETE` under `/api/accounts` for active financial accounts.

#### Scenario: List accounts
- **WHEN** client calls `GET /api/accounts`
- **THEN** all non-deleted financial accounts are returned

#### Scenario: Update display name
- **WHEN** client sends `PUT /api/accounts/{id}` with `{ "display_name": "Joint savings" }`
- **THEN** the account label is updated for UI display

### Requirement: Parser bank name mapping
Each registered parser SHALL map to a default `bank_name` for auto-provisioned accounts (e.g. `heritage` → `Heritage`).

#### Scenario: Heritage default bank name
- **WHEN** first Heritage PDF is imported
- **THEN** auto-created account has `bank_name` of `Heritage`
