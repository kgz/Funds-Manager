## 1. Backend

- [ ] 1.1 `net_worth_over_time(start, end, account_id)` in `analytics.rs` (reuse balance carry-forward SQL)
- [ ] 1.2 Compose availableCash + flat assets − flat liabilities; exclude registers when account-scoped
- [ ] 1.3 `NetWorthPoint` response struct (camelCase, dollars)
- [ ] 1.4 `GET /api/analytics/net-worth` route + handler

## 2. Frontend

- [ ] 2.1 `NetWorthPoint` type + `fetchNetWorthOverTime(dateRange)` thunk
- [ ] 2.2 `net-worth.tsx` chart (line/area, currency axis, component tooltip)
- [ ] 2.3 Wire into dashboard (period + account filter, loading/empty states)

## 3. Verification

- [ ] 3.1 `cargo test` / build backend
- [ ] 3.2 `pnpm run typecheck` + `pnpm run build:embed`
- [ ] 3.3 Manual QA: trend renders, account filter updates, components add up
- [ ] 3.4 PR references Closes #56 and links #107
