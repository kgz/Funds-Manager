# Statements

## Purpose
Bank statement records derived from uploaded PDFs. Statements group transactions for an account and period.

## Requirements

### Requirement: Statement fields
A statement SHALL have: `date`, `account_id`, `opening_balance` (cents), `closing_balance` (cents), `created_at`, and optional `deleted_at` for soft-delete.

#### Scenario: New statement from PDF
- **WHEN** a Heritage PDF is successfully parsed
- **THEN** a statement row is inserted with opening balance from the parser and closing balance updated after all transactions are inserted

### Requirement: Soft-delete
Statements SHALL support soft-delete via `deleted_at`. Deleted statements MUST NOT appear in `GET /api/statements` or contribute transactions to `GET /api/transactions`.

#### Scenario: Delete statement
- **WHEN** `DELETE /api/statements/{id}` is called
- **THEN** the statement's `deleted_at` is set and HTTP 204 is returned

#### Scenario: Idempotent delete
- **WHEN** `DELETE /api/statements/{id}` is called for an already-deleted or unknown id
- **THEN** the API returns an appropriate not-found or no-op response per `Statement::delete` behavior

### Requirement: Re-import replaces existing period
Before inserting a parsed statement, the system SHALL soft-delete any active statements matching the same `account_id` and `date`.

#### Scenario: Re-upload same month
- **WHEN** a PDF is uploaded for an account and statement date that already has an active statement
- **THEN** the existing statement(s) for that account+date are soft-deleted before the new statement and transactions are inserted

### Requirement: List active statements
`GET /api/statements` SHALL return all statements where `deleted_at IS NULL`, ordered by the model's default query.

#### Scenario: List excludes deleted
- **WHEN** a statement has been soft-deleted
- **THEN** it does not appear in the list response

### Requirement: PDF upload endpoint
`POST /api/statements` SHALL accept multipart file uploads. Only PDF files are processed; non-PDF files are skipped with an error message. Query param `parser` defaults to `heritage`.

#### Scenario: Successful upload
- **WHEN** one or more valid PDFs are uploaded and all parse successfully
- **THEN** HTTP 200 is returned with `processed_files` and empty `errors`

#### Scenario: Partial failure
- **WHEN** some PDFs succeed and some fail
- **THEN** HTTP 202 is returned with both `processed_files` and `errors`

#### Scenario: All failed
- **WHEN** no PDFs are successfully processed
- **THEN** HTTP 400 is returned

#### Scenario: Temp file cleanup
- **WHEN** a PDF is processed (success or failure after write)
- **THEN** the temporary file on disk is removed
