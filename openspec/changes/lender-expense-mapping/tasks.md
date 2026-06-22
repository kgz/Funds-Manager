## 1. Backend

- [x] 1.1 Migration `lender_expense_buckets` + `category_lender_mappings`
- [x] 1.2 `lender_expense` model (defaults, summary, upsert)
- [x] 1.3 API routes
- [x] 1.4 `cargo test`

## 2. Frontend

- [x] 2.1 Types + fetch/upsert
- [x] 2.2 `/lender-expenses` page
- [x] 2.3 Sidebar nav + route
- [x] 2.4 `pnpm run typecheck`

## 3. Breakdown

- [x] 3.1 Move-to-category on merchant sub-rows
- [x] 3.2 API `PATCH /api/transactions/categories-by-group`

## 4. Manual exclude

- [x] 4.1 Migration `category_lender_exclusions` (or equivalent)
- [x] 4.2 API: persist/clear exclusion; summary respects explicit excludes
- [x] 4.3 Mapping page: **Excluded** option in lender bucket dropdown
- [x] 4.4 Default heuristics: loan/debt category names suggest exclude (optional)

## 5. Bucket breakdown

- [x] 5.1 `GET /api/lender-expenses/buckets/{bucket_key}/breakdown`
- [x] 5.2 Expandable bucket rows on summary page (lazy-loaded category lines)
- [ ] 5.3 Merchant / transaction drill-down (follow-up for #117)

## 6. Verification

- [ ] 6.1 Manual QA
- [ ] 6.2 PR `Closes #112`
