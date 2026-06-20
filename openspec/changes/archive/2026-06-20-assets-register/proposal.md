## Why

A broker-ready report (epic #107) needs the asset side of the balance sheet: property value, vehicles, super, and **balances held outside the app** (savings at another bank, an offset at a different lender). Without property value there is no equity or LVR. #108 added liabilities; this adds the matching assets register so net worth (#56) and LVR (#57) can be computed.

## What Changes

- New `assets` persistence (Postgres) with CRUD API
- New `/assets` page: list, add, edit, delete assets and external balances
- Fields: name, kind, value, valuation date + source, optional linked liability (property → home loan), notes
- Total asset value shown for the list
- Stale-valuation indicator on the page (valuation older than 12 months)
- Sidebar nav entry

## Capabilities

### New Capabilities

- `assets`: data model, API, and business rules for asset / external-balance records

### Modified Capabilities

- `api`: register assets REST routes
- `frontend`: new page, nav link, Redux slice/thunks

## Impact

- `database/migrations/` — `assets` table
- `database/src/models/assets.rs` (new), `schema.rs`, `models/mod.rs`
- `app/src/routes/assets.rs` (new), `server/scopes/api.rs`
- `frontend/src/types/assets.ts` (new), `store/slices/assetsSlice.ts` (new), `store/thunks/assets.ts` (new), `store/store.ts`
- `frontend/src/pages/assets.tsx` (new), `sidebar.tsx`, `App.tsx`
- Unblocks #56, #57; consumed later by #117 (broker report)

## Non-Goals (this change)

- Net worth aggregation across assets + liabilities (#56)
- Equity / LVR computation from the property↔loan link (#57)
- Broker report rendering (#117)
- Automatic valuation lookups / market data feeds
- Auth / multi-user concerns
