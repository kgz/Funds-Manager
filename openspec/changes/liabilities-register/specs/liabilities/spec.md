## ADDED Requirements

### Requirement: Liability fields

A liability SHALL have: `name` (required), `kind` (required; one of `home_loan`, `car_loan`, `personal_loan`, `credit_card`, `bnpl`, `hecs`, `other`), `balance_cents` (required non-negative integer), and optional `lender`, `credit_limit_cents`, `original_amount_cents`, `interest_rate_bps`, `rate_type` (`fixed`|`variable`), `repayment_cents`, `repayment_frequency` (`weekly`|`fortnightly`|`monthly`), `term_months`, `financial_account_id`, `notes`, plus `created_at` and optional `deleted_at`.

#### Scenario: Minimal liability
- **WHEN** a liability is created with only `name`, `kind`, and `balance_cents`
- **THEN** it is stored and all optional fields are null

#### Scenario: Invalid kind
- **WHEN** `kind` is not in the allowed set
- **THEN** the API returns 400

### Requirement: List liabilities

`GET /api/liabilities` SHALL return active (non-deleted) liabilities ordered consistently, and SHALL include `total_balance_cents` summing the `balance_cents` of returned items.

#### Scenario: Total owed
- **WHEN** two active liabilities have balances of 29100000 and 1667400 cents
- **THEN** the response `total_balance_cents` is 30767400

#### Scenario: Deleted hidden
- **WHEN** a liability is soft-deleted
- **THEN** it does not appear in the list and is excluded from `total_balance_cents`

### Requirement: Create liability

`POST /api/liabilities` SHALL accept the liability fields and create a record.

#### Scenario: Negative balance
- **WHEN** `balance_cents` is negative
- **THEN** the API returns 400

#### Scenario: Invalid linked account
- **WHEN** `financial_account_id` references a missing financial account
- **THEN** the API returns 400

### Requirement: Update liability

`PUT /api/liabilities/{id}` SHALL support partial updates to all mutable fields, including clearing nullable fields.

#### Scenario: Not found
- **WHEN** the id does not exist or is soft-deleted
- **THEN** the API returns 404

### Requirement: Soft-delete liability

`DELETE /api/liabilities/{id}` SHALL set `deleted_at` and return 204.

#### Scenario: Idempotent absence
- **WHEN** the id does not exist or is already deleted
- **THEN** the API returns 404
