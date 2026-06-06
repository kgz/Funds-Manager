# PDF Parsing

## Purpose
Extracts statement metadata and transactions from bank PDFs via pdfium and bank-specific parsers.

## Requirements

### Requirement: Heritage parser
The system SHALL register a `heritage` bank parser. `available_parsers()` returns `["heritage"]`. Unknown parser names MUST be rejected at upload.

#### Scenario: Default parser
- **WHEN** `POST /api/statements` is called without `parser` query param
- **THEN** the heritage parser is used

#### Scenario: Unknown parser
- **WHEN** `?parser=unknown` is specified
- **THEN** upload fails with HTTP 400

### Requirement: pdfium extraction
PDF text SHALL be extracted using pdfium. Library path resolution order: `PDFIUM_LIBRARY_PATH` env, then `./lib/libpdfium.so`, then `app/lib/libpdfium.so`.

#### Scenario: Custom pdfium path
- **WHEN** `PDFIUM_LIBRARY_PATH` points to an existing file
- **THEN** that library is used for extraction

### Requirement: Parsed statement output
A successful parse SHALL produce: `statement_date`, `account_id`, `opening_balance_cents`, `closing_balance_cents`, and a list of transactions each with `transaction_date`, `description`, `amount_cents`, `balance_cents`.

#### Scenario: Amount derivation
- **WHEN** the heritage parser processes transaction lines
- **THEN** `amount_cents` is derived as the difference between running balance and previous balance

### Requirement: CLI parser
`statement-parser-cli` SHALL expose a command-line interface that parses a file and prints JSON to stdout, using the same `parse_statement` function as the API.

#### Scenario: CLI parity
- **WHEN** the same PDF is parsed via CLI and API with the same parser name
- **THEN** both use the same parser implementation in `crates/statement-parser`
