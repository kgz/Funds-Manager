# Planning

Plan upcoming **cashflow** and **loan** events (redraw, refinance, repayment change) from the Planning page (`/planning`).

> Screenshots will land with the docs capture pipeline ([#295](https://github.com/kgz/Funds-Manager/issues/295)). Until then this page matches the v1 product contract.

## Open Planning

1. Sidebar → **Planning** (or ⌘K → “Add … plan”).
2. `/planned` redirects to `/planning`.

## Plan kinds (v1)

| Kind | What you enter | What it drives today |
|------|----------------|----------------------|
| Cashflow | Name, amount, date, optional category | Predictions cash on that date; match/link to bank txns |
| Loan redraw | Amount, liability, destination account, date | Predictions once cash credit on date (not income KPIs) |
| Refinance | Old liability, new name, rate, repayment, date | **Stored + UI only** — does not change predictions or liabilities yet |
| Repayment change | Liability, new repayment/rate, date | **Stored + UI only** — same as refinance |

Driving refinance/repayment through predictions and the liabilities register is [#294](https://github.com/kgz/Funds-Manager/issues/294).

## Filters

Use **All | Cashflow | Loans** to narrow the table. Account filter is context for cashflow; for loans it applies to redraw destination accounts.

## Related

- [#143](https://github.com/kgz/Funds-Manager/issues/143) Planning hub v1
- [#294](https://github.com/kgz/Funds-Manager/issues/294) Planning v2 — drive the app
