## ADDED Requirements

### Requirement: Window-bound statement coverage

The system SHALL compute statement coverage per account for a given `start_date` and `end_date` inclusive.

#### Scenario: Full coverage

- **WHEN** every calendar month in the window has statement coverage for each in-scope account
- **THEN** `sufficient` is true and `missingMonths` is empty for each account

#### Scenario: Gap detected

- **WHEN** a month in the window lacks statement coverage for an account
- **THEN** that month appears in `missingMonths` and `sufficient` is false

### Requirement: Coverage summary statement

The API SHALL return a human-readable coverage summary (e.g. months covered vs expected).

#### Scenario: Multi-account summary

- **WHEN** client requests coverage for a date range spanning multiple accounts
- **THEN** response includes per-account lines and an overall sufficient flag
