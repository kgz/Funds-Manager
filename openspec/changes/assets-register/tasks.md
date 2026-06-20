## 1. Database

- [x] 1.1 Migration: `assets` table (BIGINT cents, kind CHECK, FK to liabilities)
- [x] 1.2 Diesel model + schema registration
- [x] 1.3 Queries: list active + total, find, insert, update (partial), soft-delete
- [x] 1.4 Rust tests for kind validation

## 2. API

- [x] 2.1 `GET /api/assets` with `total_value_cents`
- [x] 2.2 `POST /api/assets`
- [x] 2.3 `PUT /api/assets/{id}`
- [x] 2.4 `DELETE /api/assets/{id}`
- [x] 2.5 Register `assets_service()` in app scope
- [x] 2.6 Validation: kind set, non-negative value, liability FK

## 3. Frontend — data layer

- [x] 3.1 Types + API client + normalizers
- [x] 3.2 Redux slice + thunks: list, create, update, delete; register in store

## 4. Frontend — page

- [x] 4.1 `/assets` page shell (header, total-value stat card)
- [x] 4.2 Table of assets with kind badge + stale-valuation indicator
- [x] 4.3 Add/Edit modal form (value, valuation date + source, optional loan link)
- [x] 4.4 Delete confirmation
- [x] 4.5 Empty, loading, error states
- [x] 4.6 Route + sidebar nav link

## 5. Verification

- [x] 5.1 `cargo test` in `database/` and `app/`
- [x] 5.2 `pnpm run typecheck` + `pnpm run build:embed`
- [x] 5.3 Manual QA: create, edit, delete, total + stale flag
- [x] 5.4 PR references Closes #109 and links #107
