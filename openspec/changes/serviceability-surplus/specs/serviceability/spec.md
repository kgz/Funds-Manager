# Serviceability

## Purpose

Compute monthly surplus and stress-tested surplus for broker/lender assessment from income, liability repayments, and living expenses.

## Requirements

### Requirement: Monthly surplus

The system SHALL compute `surplus_monthly = income_monthly − repayments_monthly − living_expenses_monthly` for an inclusive date range.

#### Scenario: Positive surplus
- **WHEN** income exceeds repayments plus living expenses for the range
- **THEN** `surplus_monthly_dollars` is positive

### Requirement: Stress-tested surplus

The system SHALL recompute repayments for variable-rate liabilities using a configurable rate buffer (default +300 bps) and return `stressed_surplus_monthly_dollars`.

#### Scenario: Variable debt buffered
- **WHEN** a liability has `rate_type = variable` and `interest_rate_bps = 600`
- **THEN** stressed repayment uses rate 900 bps for that liability

#### Scenario: Fixed debt unchanged
- **WHEN** a liability has `rate_type = fixed`
- **THEN** stressed repayment equals baseline repayment

### Requirement: Committed vs discretionary split

Living expenses SHALL be split into committed buckets (housing, utilities, insurance, childcare_education, healthcare) and discretionary buckets (all other lender buckets plus unmapped).

#### Scenario: Split totals
- **WHEN** summary is returned
- **THEN** `committed_living_monthly_dollars + discretionary_living_monthly_dollars` equals living expenses total from lender summary

### Requirement: Input breakdown

The response SHALL include line-level inputs: income streams used, liabilities with baseline and stressed repayments, and living expense bucket totals.

#### Scenario: Missing repayment
- **WHEN** a liability has no `repayment_cents`
- **THEN** it appears in `liabilities` with `included: false` and does not affect repayment totals

### Requirement: Confirmed income preference

Income SHALL use confirmed streams when at least one exists; otherwise all detected streams with `income_uses_unconfirmed: true`.

#### Scenario: Confirmed streams exist
- **WHEN** one or more streams have `is_confirmed = true`
- **THEN** only confirmed streams contribute to `income_monthly_dollars`

### Requirement: Report-ready output

The API response SHALL be stable JSON suitable for embedding in a broker report (#117) without further aggregation.
