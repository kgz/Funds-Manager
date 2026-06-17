# Planned spending

## Purpose
User-entered upcoming expenses and income, persisted in Postgres for filtering and future prediction features.

## Requirements

### Requirement: Planned spending fields
A planned spending item SHALL have: `name` (required), `amount_cents` (non-zero integer; sign matches transactions — positive income, negative spend), `start_date` (required), optional `end_date` (API only in v1; UI uses single date), optional `category_id`, optional `notes`, `created_at`, and optional `deleted_at`.

#### Scenario: v1 single date
- **WHEN** an item is created from the UI in v1
- **THEN** `end_date` is null and the item matches period filters when `start_date` is within the range

### Requirement: List planned spending
`GET /api/planned-spending` SHALL return active (non-deleted) items. Optional query params `from` and `to` (ISO `YYYY-MM-DD`) filter by date. When both are provided, items whose date span overlaps the inclusive range are returned. When only `from` is provided, items with `start_date` on or after `from` are returned.

#### Scenario: Overlap filter
- **WHEN** `from=2026-03-01` and `to=2026-03-31` and an item has `start_date` in March
- **THEN** the item is included in the response

#### Scenario: Future filter
- **WHEN** only `from` is provided with today's date
- **THEN** items dated today or later are returned

#### Scenario: Period total
- **WHEN** a date filter is applied
- **THEN** the response includes `total_cents` summing `amount_cents` of all returned items

### Requirement: Create planned spending
`POST /api/planned-spending` SHALL accept `name`, `amount_cents`, `start_date`, optional `end_date`, optional `category_id`, optional `notes`.

#### Scenario: Invalid amount
- **WHEN** `amount_cents` is zero
- **THEN** the API returns 400

#### Scenario: Invalid category
- **WHEN** `category_id` references a deleted or missing category
- **THEN** the API returns 400

### Requirement: Update planned spending
`PUT /api/planned-spending/{id}` SHALL support partial updates to all mutable fields.

#### Scenario: Not found
- **WHEN** the id does not exist or is soft-deleted
- **THEN** the API returns 404

### Requirement: Soft-delete planned spending
`DELETE /api/planned-spending/{id}` SHALL set `deleted_at`.

#### Scenario: Deleted item hidden
- **WHEN** an item is soft-deleted
- **THEN** it does not appear in `GET /api/planned-spending`
