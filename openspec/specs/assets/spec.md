# assets Specification

## Purpose
TBD - created by archiving change assets-register. Update Purpose after archive.
## Requirements
### Requirement: Asset fields

An asset SHALL have: `name` (required), `kind` (required; one of `property`, `vehicle`, `super`, `savings`, `investment`, `other`), `value_cents` (required non-negative integer), and optional `valued_at`, `value_source`, `liability_id`, `notes`, plus `created_at` and optional `deleted_at`.

#### Scenario: Minimal asset
- **WHEN** an asset is created with only `name`, `kind`, and `value_cents`
- **THEN** it is stored and all optional fields are null

#### Scenario: Invalid kind
- **WHEN** `kind` is not in the allowed set
- **THEN** the API returns 400

### Requirement: List assets

`GET /api/assets` SHALL return active (non-deleted) assets ordered consistently, and SHALL include `total_value_cents` summing the `value_cents` of returned items.

#### Scenario: Total value
- **WHEN** two active assets have values of 65000000 and 1500000 cents
- **THEN** the response `total_value_cents` is 66500000

#### Scenario: Deleted hidden
- **WHEN** an asset is soft-deleted
- **THEN** it does not appear in the list and is excluded from `total_value_cents`

### Requirement: Create asset

`POST /api/assets` SHALL accept the asset fields and create a record.

#### Scenario: Negative value
- **WHEN** `value_cents` is negative
- **THEN** the API returns 400

#### Scenario: Invalid linked liability
- **WHEN** `liability_id` references a missing liability
- **THEN** the API returns 400

### Requirement: Update asset

`PUT /api/assets/{id}` SHALL support partial updates to all mutable fields, including clearing nullable fields.

#### Scenario: Not found
- **WHEN** the id does not exist or is soft-deleted
- **THEN** the API returns 404

### Requirement: Soft-delete asset

`DELETE /api/assets/{id}` SHALL set `deleted_at` and return 204.

#### Scenario: Idempotent absence
- **WHEN** the id does not exist or is already deleted
- **THEN** the API returns 404

