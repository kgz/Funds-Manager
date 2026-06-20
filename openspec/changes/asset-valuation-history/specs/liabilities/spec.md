## ADDED Requirements

### Requirement: Liability balance history

A liability SHALL have a history of balance snapshots, each with `balanced_at`
(required date), `balance_cents` (required non-negative integer), and optional
`source`. Snapshots are soft-deletable. A liability's `balance_cents` SHALL
reflect its newest active snapshot.

#### Scenario: Newest snapshot wins
- **WHEN** a liability has snapshots dated 2020-01-01 ($500,000) and 2025-06-01 ($420,000)
- **THEN** the liability's current `balance_cents` reflects the 2025-06-01 value

#### Scenario: Remove snapshot recomputes current
- **WHEN** the newest snapshot is soft-deleted
- **THEN** the liability's current balance falls back to the next most recent snapshot

### Requirement: Origination seeding

`POST /api/liabilities` SHALL accept optional `originated_date` paired with
`original_amount_cents`. When both are provided, a snapshot SHALL be created at
`originated_date` so tracking starts from loan origination. The current balance
SHALL also be seeded as a snapshot.

#### Scenario: Started-at seeds history
- **WHEN** a liability is created with a current balance and original amount + start date
- **THEN** two snapshots exist, and the current balance reflects the newest

### Requirement: Balances API

`GET/POST /api/liabilities/{id}/balances` SHALL list and add snapshots, and
`DELETE /api/liabilities/{id}/balances/{balanceId}` SHALL soft-delete one.

#### Scenario: Add snapshot
- **WHEN** a snapshot is posted for an existing liability
- **THEN** it appears in the liability's history and updates the current balance

### Requirement: Net worth uses liability history

The net worth series SHALL value each liability at its interpolated balance as
of each date (linear between snapshots), contributing 0 before the liability's
first snapshot.

#### Scenario: Liability starts mid-window
- **WHEN** a liability's earliest snapshot is dated within the chart window
- **THEN** net worth includes that liability only from its first snapshot onward
