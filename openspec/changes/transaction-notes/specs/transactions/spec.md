## MODIFIED Requirements

### Requirement: Transaction fields
A transaction SHALL have: `statement_id`, `description`, `amount` (cents), `transaction_date`, `balance` (cents), `status`, optional `category_id`, optional `notes`, `created_at`, `last_updated`, and optional `deleted_at`.

#### Scenario: Parsed import defaults
- **WHEN** a transaction is created from PDF import
- **THEN** `status` is set to `"parsed"`, `category_id` is set from `CategoryPredictor` (or null if no match), and `notes` is null

## ADDED Requirements

### Requirement: Transaction notes
Users SHALL be able to attach optional free-text notes to a transaction. Notes are stored on `transaction_data.notes` and returned by `GET /api/transactions`.

#### Scenario: Notes in list response
- **WHEN** client requests `GET /api/transactions`
- **THEN** each transaction includes a `notes` field (`string` or `null`)

### Requirement: Update transaction notes
`PATCH /api/transactions/{id}/notes` SHALL accept `{ "notes": string | null }`. Whitespace-only strings MUST be stored as null. The response SHALL be the updated transaction JSON.

#### Scenario: Set note
- **WHEN** client sends `{ "notes": "reimbursable" }` for an existing transaction
- **THEN** the note is saved and returned in the response

#### Scenario: Clear note
- **WHEN** client sends `{ "notes": null }` or empty/whitespace-only text
- **THEN** `notes` is cleared

#### Scenario: Unknown transaction
- **WHEN** `id` does not exist or transaction is soft-deleted
- **THEN** HTTP 404 is returned
