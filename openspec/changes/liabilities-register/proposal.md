## Why

The app tracks transactions and balances but cannot represent a **loan** as an entity. To report a real financial position to a broker/lender (epic #107) it must hold structured debts: home loan, car loan, credit card, BNPL, HECS, etc. This is the foundation that unblocks net worth (#56) and equity/LVR (#57).

## What Changes

- New `liabilities` persistence (Postgres) with CRUD API
- New `/liabilities` page: list, add, edit, delete liabilities
- Fields: name, kind, lender, current balance, credit limit, original amount, interest rate, rate type, repayment + frequency, term remaining, optional linked financial account, notes
- Total outstanding balance shown for the list
- Sidebar nav entry under General

## Capabilities

### New Capabilities

- `liabilities`: data model, API, and business rules for liability (loan) records

### Modified Capabilities

- `api`: register liabilities REST routes
- `frontend`: new page, nav link, Redux slice/thunks

## Impact

- `database/migrations/` — `liabilities` table
- `database/src/models/liabilities.rs` (new), `schema.rs`, `models/mod.rs`
- `app/src/routes/liabilities.rs` (new), `server/scopes/api.rs`
- `frontend/src/types/liabilities.ts` (new), `store/slices/liabilitiesSlice.ts` (new), `store/thunks/liabilities.ts` (new), `store/store.ts`
- `frontend/src/pages/liabilities.tsx` (new), `sidebar.tsx`, `App.tsx`
- Unblocks #56, #57; consumed later by #117 (broker report)

## Non-Goals (this change)

- Net worth / LVR / equity calculations (#56, #57)
- Broker report rendering (#117)
- Offset / loan-interest accrual and the "offset snowball" maths (deferred, see #107)
- Auto-suggesting a liability from a detected repeat payment (follow-up)
- Multi-user / auth concerns
