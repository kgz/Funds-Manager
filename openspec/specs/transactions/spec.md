# Transactions

## Purpose
Individual financial transactions linked to a statement. Primary categorization is stored on `transaction_data.category_id`.

## Requirements

### Requirement: Transaction fields
A transaction SHALL have: `statement_id`, `description`, `amount` (cents), `transaction_date`, `balance` (cents), `status`, optional `category_id`, `created_at`, `last_updated`, and optional `deleted_at`.

#### Scenario: Parsed import defaults
- **WHEN** a transaction is created from PDF import
- **THEN** `status` is set to `"parsed"` and `category_id` is set from `CategoryPredictor` (or null if no match)

### Requirement: List from active statements only
`GET /api/transactions` SHALL return non-deleted transactions whose parent statement is active (not soft-deleted). If no active statements exist, an empty array is returned.

#### Scenario: Deleted statement hides transactions
- **WHEN** a statement is soft-deleted
- **THEN** its transactions no longer appear in `GET /api/transactions`

### Requirement: Manual category assignment
`PATCH /api/transactions/{id}/category` SHALL accept `{ "category_id": number | null }`. If a category id is provided, it MUST reference an existing non-deleted category.

#### Scenario: Assign category
- **WHEN** a valid `category_id` is sent for an existing transaction
- **THEN** the transaction is updated and returned as JSON

#### Scenario: Clear category
- **WHEN** `category_id` is null
- **THEN** the transaction's category is cleared

#### Scenario: Unknown category rejected
- **WHEN** `category_id` references a missing category
- **THEN** HTTP 400 is returned

### Requirement: Bulk recategorize uncategorized
`POST /api/transactions/recategorize-uncategorized` SHALL run `CategoryPredictor` on all non-deleted transactions with `category_id IS NULL` and update matches. Response: `{ "updated": <count> }`.

#### Scenario: Recategorize applies predictor
- **WHEN** uncategorized transactions exist and the predictor can match descriptions
- **THEN** those transactions receive a `category_id` and `updated` reflects the count
