# Tasks

## 1. Database
- [x] 1.1 `asset_valuations` migration with backfill from current snapshots
- [x] 1.2 Update `schema.rs` (table, joinable, allow_tables)

## 2. Backend
- [x] 2.1 `AssetValuation` model: list/create/soft_delete + `active_points`
- [x] 2.2 Recompute asset snapshot from newest valuation
- [x] 2.3 Seed current + optional purchase valuation on asset create
- [x] 2.4 Nested valuations API under `/api/assets/{id}/valuations`
- [x] 2.5 `net_worth_over_time` uses per-asset valuation carry-forward
- [x] 2.6 `cargo test` / build

## 3. Frontend
- [x] 3.1 Valuation types + API client + purchase fields on payload
- [x] 3.2 Asset add form: "bought at" price + date
- [x] 3.3 Asset edit modal: valuation history (list/add/remove)
- [x] 3.4 typecheck + build
