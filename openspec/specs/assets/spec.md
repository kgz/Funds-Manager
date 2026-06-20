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

### Requirement: Asset valuation history

An asset SHALL have a history of valuations, each with `valued_at` (required date),
`value_cents` (required non-negative integer), and optional `source`. Valuations
are soft-deletable. An asset's `value_cents`, `valued_at`, and `value_source`
SHALL reflect its newest active valuation.

#### Scenario: Newest valuation wins
- **WHEN** an asset has valuations dated 2024-01-01 ($500,000) and 2025-06-01 ($560,000)
- **THEN** the asset's current `value_cents` reflects the 2025-06-01 value

#### Scenario: Remove valuation recomputes current
- **WHEN** the newest valuation is soft-deleted
- **THEN** the asset's current value falls back to the next most recent valuation

### Requirement: Purchase price seeding

`POST /api/assets` SHALL accept optional `purchase_price_cents` and `purchase_date`.
When both are provided, a valuation SHALL be created at `purchase_date` so tracking
starts from acquisition. The current value SHALL also be seeded as a valuation.

#### Scenario: Bought-at seeds history
- **WHEN** an asset is created with a current value and a purchase price + date
- **THEN** two valuations exist, and the current value reflects the newest

### Requirement: Valuations API

`GET/POST /api/assets/{id}/valuations` SHALL list and add valuations, and
`DELETE /api/assets/{id}/valuations/{valuationId}` SHALL soft-delete one.

#### Scenario: Add valuation
- **WHEN** a valuation is posted for an existing asset
- **THEN** it appears in the asset's valuation list and updates the current value

#### Scenario: Unknown asset
- **WHEN** the asset id does not exist or is deleted
- **THEN** the API returns 404

### Requirement: Net worth uses valuation history

The net worth series SHALL value each asset at its interpolated value as of each
date (linear between valuations), contributing 0 before the asset's first valuation.

#### Scenario: Asset starts mid-window
- **WHEN** an asset's earliest valuation is dated within the chart window
- **THEN** net worth includes that asset only from its first valuation onward

