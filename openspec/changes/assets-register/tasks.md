## 1. Database

- [ ] 1.1 Migration: `assets` table (BIGINT cents, kind CHECK, FK to liabilities)
- [ ] 1.2 Diesel model + schema registration
- [ ] 1.3 Queries: list active + total, find, insert, update (partial), soft-delete
- [ ] 1.4 Rust tests for kind validation

## 2. API

- [ ] 2.1 `GET /api/assets` with `total_value_cents`
- [ ] 2.2 `POST /api/assets`
- [ ] 2.3 `PUT /api/assets/{id}`
- [ ] 2.4 `DELETE /api/assets/{id}`
- [ ] 2.5 Register `assets_service()` in app scope
- [ ] 2.6 Validation: kind set, non-negative value, liability FK

## 3. Frontend — data layer

- [ ] 3.1 Types + API client + normalizers
- [ ] 3.2 Redux slice + thunks: list, create, update, delete; register in store

## 4. Frontend — page

- [ ] 4.1 `/assets` page shell (header, total-value stat card)
- [ ] 4.2 Table of assets with kind badge + stale-valuation indicator
- [ ] 4.3 Add/Edit modal form (value, valuation date + source, optional loan link)
- [ ] 4.4 Delete confirmation
- [ ] 4.5 Empty, loading, error states
- [ ] 4.6 Route + sidebar nav link

## 5. Verification

- [ ] 5.1 `cargo test` in `database/` and `app/`
- [ ] 5.2 `pnpm run typecheck` + `pnpm run build:embed`
- [ ] 5.3 Manual QA: create, edit, delete, total + stale flag
- [ ] 5.4 PR references Closes #109 and links #107
