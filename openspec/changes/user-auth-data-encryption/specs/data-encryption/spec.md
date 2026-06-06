## ADDED Requirements

### Requirement: Encryption key configuration
The server SHALL require `DATA_ENCRYPTION_KEY` in production. The key SHALL be a 32-byte secret used for AES-256-GCM field encryption.

#### Scenario: Missing key in production
- **WHEN** the server starts in production without `DATA_ENCRYPTION_KEY`
- **THEN** startup fails with a clear error

### Requirement: Sensitive field encryption
Transaction descriptions and notes SHALL be encrypted at rest before persistence. Statement PDF content or stored file bytes SHALL be encrypted at rest.

#### Scenario: Description stored encrypted
- **WHEN** a transaction with description "WOOLWORTHS" is saved
- **THEN** the value in MySQL is not plaintext "WOOLWORTHS"

#### Scenario: Description readable via API
- **WHEN** an authenticated client requests `GET /api/transactions`
- **THEN** descriptions are decrypted and returned as plaintext in JSON

### Requirement: Queryable fields remain plain
Monetary amounts, dates, category IDs, and category names SHALL remain unencrypted to support dashboard aggregation and filtering.

#### Scenario: Amount queryable
- **WHEN** dashboard aggregates spending by category
- **THEN** amount and category_id queries work without decrypting entire tables client-side

### Requirement: Existing data migration
The system SHALL provide a one-time migration to encrypt existing plaintext sensitive fields.

#### Scenario: Legacy rows encrypted
- **WHEN** migration runs against a database with plaintext descriptions
- **THEN** those rows are updated to encrypted form and remain readable through the API
