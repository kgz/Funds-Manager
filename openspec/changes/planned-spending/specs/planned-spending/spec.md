## ADDED Requirements

### Requirement: Planned spending fields

A planned spending item SHALL have: `name` (required), `amount_cents` (positive integer), `start_date` (required), optional `end_date`, optional `category_id`, optional `notes`, `created_at`, and optional `deleted_at`.

#### Scenario: Single-day item

- **WHEN** `end_date` is omitted or null
- **THEN** the item represents spending on `start_date` only

#### Scenario: Date range item

- **WHEN** `end_date` is set
- **THEN** `end_date` MUST be greater than or equal to `start_date`

### Requirement: List planned spending

`GET /api/planned-spending` SHALL return active (non-deleted) items. Optional query params `from` and `to` (ISO `YYYY-MM-DD`) SHALL filter to items whose date span overlaps the inclusive range.

#### Scenario: Overlap filter

- **WHEN** `from=2026-03-01` and `to=2026-03-31` and an item spans `2026-02-15` to `2026-03-10`
- **THEN** the item is included in the response

#### Scenario: Period total

- **WHEN** `from` and `to` are provided
- **THEN** the response includes `totalCents` summing `amount_cents` of all returned items

### Requirement: Create planned spending

`POST /api/planned-spending` SHALL accept `name`, `amountCents`, `startDate`, optional `endDate`, optional `categoryId`, optional `notes`.

#### Scenario: Invalid amount

- **WHEN** `amountCents` is zero or negative
- **THEN** the API returns 400

#### Scenario: Invalid category

- **WHEN** `categoryId` references a deleted or missing category
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
