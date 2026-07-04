## ADDED Requirements

### Requirement: Serviceability summary endpoint

`GET /api/serviceability/summary` SHALL accept `start_date`, `end_date` (ISO `YYYY-MM-DD`), optional `account_id`, optional `rate_buffer_bps` (default 300), and optional `min_occurrences` (default 3). It SHALL return surplus breakdown JSON.

#### Scenario: Valid range
- **WHEN** `start_date=2026-01-01` and `end_date=2026-06-30`
- **THEN** response includes income, repayments, living expenses, surplus, stressed surplus, and committed/discretionary split

#### Scenario: Invalid range
- **WHEN** `start_date` is after `end_date`
- **THEN** the API returns 400
