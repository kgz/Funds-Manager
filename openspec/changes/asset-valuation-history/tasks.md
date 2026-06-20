# Tasks

## 1. Database
- [x] 1.1 `asset_valuations` migration with backfill from current snapshots
- [x] 1.2 `liability_balances` migration with backfill from current balances
- [x] 1.3 Update `schema.rs` (tables, joinables, allow_tables)

## 2. Backend — assets
- [x] 2.1 `AssetValuation` model: list/create/soft_delete + `active_points`
- [x] 2.2 Recompute asset snapshot from newest valuation
- [x] 2.3 Seed current + optional purchase valuation on asset create
- [x] 2.4 Nested valuations API under `/api/assets/{id}/valuations`

## 3. Backend — liabilities
- [x] 3.1 `LiabilityBalance` model: list/create/soft_delete + `active_points`
- [x] 3.2 Recompute liability snapshot from newest balance
- [x] 3.3 Seed current + optional origination snapshot on liability create
- [x] 3.4 Nested balances API under `/api/liabilities/{id}/balances`

## 4. Net worth
- [x] 4.1 Linear interpolation for assets and liabilities between snapshots
- [x] 4.2 Union valuation/balance dates into chart day grid
- [x] 4.3 Time-scale x-axis on net worth chart
- [x] 4.4 `cargo test` / build

## 5. Frontend
- [x] 5.1 Asset valuation types + bought-at + history UI
- [x] 5.2 Liability balance types + started-at + history UI
- [x] 5.3 typecheck + build
