## ADDED Requirements

### Requirement: Lender expense API

The API SHALL expose lender expense endpoints under `/api/lender-expenses`:

- `GET /buckets` — list canonical buckets
- `GET /mappings` — categories with resolved lender bucket
- `PUT /mappings` — upsert category → bucket override (`category_id`, `bucket_key`)
- `GET /summary` — bucket totals and monthly averages (`start_date`, `end_date`, optional `account_id`)

#### Scenario: Summary query
- **WHEN** `GET /api/lender-expenses/summary?start_date=2025-01-01&end_date=2025-06-30`
- **THEN** response includes buckets with `totalDollars`, `monthlyAverageDollars`, and `transactionCount`
