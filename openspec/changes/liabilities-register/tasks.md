## 1. Database

- [ ] 1.1 Migration: `liabilities` table (BIGINT cents, kind/rate_type/frequency CHECKs, FK to financial_accounts)
- [ ] 1.2 Diesel model + schema registration (`diesel migration run`)
- [ ] 1.3 Queries: list active + total, find, insert, update (partial), soft-delete
- [ ] 1.4 Rust tests for kind/rate-type/frequency validation

## 2. API

- [ ] 2.1 `GET /api/liabilities` with `total_balance_cents`
- [ ] 2.2 `POST /api/liabilities`
- [ ] 2.3 `PUT /api/liabilities/{id}`
- [ ] 2.4 `DELETE /api/liabilities/{id}`
- [ ] 2.5 Register `liabilities_service()` in app scope
- [ ] 2.6 Validation: kind set, non-negative money, rate/frequency enums, account FK

## 3. Frontend — data layer

- [ ] 3.1 Types + API client + normalizers
- [ ] 3.2 Redux slice + thunks: list, create, update, delete; register in store

## 4. Frontend — page

- [ ] 4.1 `/liabilities` page shell (header, total-owed stat card)
- [ ] 4.2 Table of liabilities with kind badge
- [ ] 4.3 Add/Edit modal form (reuse input/select tokens, money inputs)
- [ ] 4.4 Delete confirmation
- [ ] 4.5 Empty, loading, error states
- [ ] 4.6 Route + sidebar nav link

## 5. Verification

- [ ] 5.1 `cargo test` in `database/` and `app/`
- [ ] 5.2 `pnpm run typecheck` + `pnpm run build:embed`
- [ ] 5.3 Manual QA: create, edit, delete, total updates
- [ ] 5.4 PR references Closes #108 and links #107
