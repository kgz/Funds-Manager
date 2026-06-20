## ADDED Requirements

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

The net worth series SHALL value each asset at its latest valuation as of each
date (carry-forward), contributing 0 before the asset's first valuation.

#### Scenario: Asset starts mid-window
- **WHEN** an asset's earliest valuation is dated within the chart window
- **THEN** net worth includes that asset only from its first valuation onward
