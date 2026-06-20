## 1. Database

- [x] 1.1 Migration: `liabilities` table (BIGINT cents, kind/rate_type/frequency CHECKs, FK to financial_accounts)
- [x] 1.2 Diesel model + schema registration (`diesel migration run`)
- [x] 1.3 Queries: list active + total, find, insert, update (partial), soft-delete
- [x] 1.4 Rust tests for kind/rate-type/frequency validation

## 2. API

- [x] 2.1 `GET /api/liabilities` with `total_balance_cents`
- [x] 2.2 `POST /api/liabilities`
- [x] 2.3 `PUT /api/liabilities/{id}`
- [x] 2.4 `DELETE /api/liabilities/{id}`
- [x] 2.5 Register `liabilities_service()` in app scope
- [x] 2.6 Validation: kind set, non-negative money, rate/frequency enums, account FK

## 3. Frontend — data layer

- [x] 3.1 Types + API client + normalizers
- [x] 3.2 Redux slice + thunks: list, create, update, delete; register in store

## 4. Frontend — page

- [x] 4.1 `/liabilities` page shell (header, total-owed stat card)
- [x] 4.2 Table of liabilities with kind badge
- [x] 4.3 Add/Edit modal form (reuse input/select tokens, money inputs)
- [x] 4.4 Delete confirmation
- [x] 4.5 Empty, loading, error states
- [x] 4.6 Route + sidebar nav link

## 5. Verification

- [x] 5.1 `cargo test` in `database/` and `app/`
- [x] 5.2 `pnpm run typecheck` + `pnpm run build:embed`
- [ ] 5.3 Manual QA: create, edit, delete, total updates
- [ ] 5.4 PR references Closes #108 and links #107
