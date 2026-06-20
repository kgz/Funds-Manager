# future-predictions Specification

## Purpose
TBD - created by archiving change future-predictions. Update Purpose after archive.
## Requirements
### Requirement: Prediction scenario fields

A scenario SHALL have `name`, `created_at`, optional `deleted_at`, and one or more **lines**. Each line SHALL have `name`, `amount_cents` (non-zero; sign matches transactions), `frequency` (`once`, `weekly`, `fortnightly`, `monthly`, `yearly`), `start_date`, optional `end_date`, optional `category_id`, and `sort_order`.

#### Scenario: Line frequency

- **WHEN** a line has `frequency` monthly
- **THEN** its amount is applied each month from `start_date` until `end_date` or horizon end

### Requirement: Prediction goal fields

A goal SHALL have `name`, `target_amount_cents` (positive integer), `target_date`, `created_at`, and optional `deleted_at`.

#### Scenario: Target balance semantics

- **WHEN** gap is calculated for a goal
- **THEN** `target_amount_cents` represents the desired balance at `target_date`

### Requirement: Baseline projection rules

The baseline engine SHALL:

1. Start from the latest known total balance for the account scope
2. Apply average monthly net from recent history (default last 3 months)
3. Apply planned spending items on their dates within the horizon
4. Accept optional client-supplied repeat-payment adjustments for v1

#### Scenario: Empty history

- **WHEN** insufficient history exists for averaging
- **THEN** the API returns a baseline with zero monthly net change and documents the limitation in metadata

### Requirement: Goal gap calculation

Given projected balance `P` at `target_date` and target `T`, gap SHALL be `T − P` in cents. When gap > 0 and months remaining > 0, suggested monthly saving SHALL be `gap / months_remaining` rounded to cents.

#### Scenario: Goal already met

- **WHEN** projected balance meets or exceeds the target
- **THEN** gap is zero or negative and the UI shows goal met messaging

