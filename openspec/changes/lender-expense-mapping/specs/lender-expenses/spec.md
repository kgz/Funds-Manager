# Lender Expenses

## Purpose

Map app transaction categories to standard lender living-expense buckets and compute monthly averages for broker declarations.

## Requirements

### Requirement: Canonical buckets

The system SHALL define a fixed set of lender expense buckets seeded in `lender_expense_buckets` (e.g. groceries, utilities, transport, insurance, childcare & education, healthcare, housing, recreation, clothing & personal care, other).

#### Scenario: List buckets
- **WHEN** client requests `GET /api/lender-expenses/buckets`
- **THEN** all buckets are returned ordered by `sort_order`

### Requirement: Category mapping

Each app category SHALL resolve to at most one lender bucket, or be excluded from living expenses. User overrides in `category_lender_mappings` take precedence over name-based defaults. Income-like categories SHALL NOT map to any bucket. Users SHALL be able to explicitly exclude any category (e.g. home loan, car loan repayment) so that spend appears in the summary **Excluded** block rather than a living bucket.

#### Scenario: Default mapping
- **WHEN** category "food" has no override
- **THEN** resolved bucket is groceries

#### Scenario: User override
- **WHEN** user sets category 5 → transport via PUT
- **THEN** subsequent summaries use transport for category 5

#### Scenario: User exclude
- **WHEN** user sets category "Home loan" to Excluded on the mapping page
- **THEN** subsequent summaries omit that category from all living buckets and include it in `excluded`

### Requirement: Expense summary

`GET /api/lender-expenses/summary` SHALL accept `start_date`, `end_date`, and optional `account_id`. It SHALL sum categorised debit spending into buckets and return total and monthly average per bucket for the inclusive calendar month span.

#### Scenario: Monthly average
- **WHEN** groceries total $1,200 over 3 calendar months
- **THEN** `monthlyAverageDollars` is 400

#### Scenario: Unmapped spend
- **WHEN** debits have no category or no resolvable bucket
- **THEN** they appear in an `unmapped` summary block

### Requirement: Bucket breakdown

`GET /api/lender-expenses/buckets/{bucket_key}/breakdown` SHALL accept the same query params as summary. It SHALL return category-level lines that roll up to the bucket total using the same resolution rules as summary. Special keys `unmapped` and `excluded` SHALL be supported.

#### Scenario: Insurance drill-down
- **WHEN** client requests breakdown for `insurance` over a date range
- **THEN** each contributing app category is returned with total, monthly average, and transaction count

#### Scenario: PDF snapshot reuse
- **WHEN** a broker report snapshot is built
- **THEN** it MAY embed the same breakdown JSON without recomputing from raw transactions
