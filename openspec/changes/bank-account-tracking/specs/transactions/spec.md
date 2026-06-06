## MODIFIED Requirements

### Requirement: Transaction fields
A transaction SHALL have: `statement_id`, `description`, `amount` (cents), `transaction_date`, `balance` (cents), `status`, optional `category_id`, `created_at`, `last_updated`, optional `deleted_at`, and SHALL be attributable to a financial account via its parent statement.

#### Scenario: Account in list response
- **WHEN** client requests `GET /api/transactions`
- **THEN** each transaction includes financial account summary (`id`, `display_name`, `bank_name`) from its statement

### Requirement: List from active statements only
`GET /api/transactions` SHALL return non-deleted transactions from active statements, optionally filtered by `account_id` query param (financial account id).

#### Scenario: Filter transactions by account
- **WHEN** client calls `GET /api/transactions?account_id=2`
- **THEN** only transactions whose statement belongs to financial account 2 are returned
