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
Re-importing a statement for the same `account_id` and `date` SHALL require explicit user confirmation. Preview (`POST /api/statements?preview=true`) MUST detect conflicts without writing to the database. Import with `replace=true` soft-deletes the existing statement(s) before insert. Import without `replace` MUST fail when a conflict exists.

#### Scenario: Preview detects conflict
- **WHEN** a PDF is uploaded with `preview=true` for an account+date that already has an active statement
- **THEN** the response lists the conflict with period label and does not modify the database

#### Scenario: Import blocked without confirm
- **WHEN** a PDF is uploaded without `replace=true` and a matching active statement exists
- **THEN** import fails and the existing statement is unchanged

#### Scenario: Confirmed replace
- **WHEN** a PDF is uploaded with `replace=true` for a conflicting account+date
- **THEN** existing statement(s) are soft-deleted and the new statement is inserted

### Requirement: List active statements
`GET /api/statements` SHALL return all statements where `deleted_at IS NULL`, ordered by the model's default query.

#### Scenario: List excludes deleted
- **WHEN** a statement has been soft-deleted
- **THEN** it does not appear in the list response

### Requirement: PDF upload endpoint
`POST /api/statements` SHALL accept multipart file uploads. Only PDF files are processed; non-PDF files are skipped with an error message. Query params: `parser` (default `heritage`), `preview` (parse only, return conflicts), `replace` (allow overwriting existing period).

#### Scenario: Preview upload
- **WHEN** `preview=true` and valid PDFs are uploaded
- **THEN** HTTP 200 returns parsed account, date, period label, and conflict flag per file without database writes

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

### Requirement: Multi-file upload stability
Processing multiple PDFs in a single `POST /api/statements` request SHALL use a shared database connection pool and SHALL batch-insert transactions per statement. The server MUST NOT open a fresh Postgres connection per query during import.

#### Scenario: Batch upload without crash
- **WHEN** user uploads several PDFs in one request
- **THEN** the server processes each file sequentially and returns per-file success or error without panicking
