## Context

OD shipped `funds-planning.html` + `css/planning.css` + `PLANNING.md`. Eng had cashflow-only planned spending. Decision: rename API to `/api/planning` with alias.

## Delivery slices

| Slice | Ticket | Scope |
|-------|--------|--------|
| **v1 (this change)** | #143 | Hub rebrand, four kinds CRUD/UI, redraw → prediction cash bump |
| **v2** | #294 | Refinance / repayment-change drive predictions, liabilities apply, net worth |
| Later | — | Consolidation kind, broker export, auto-match |

## Goals / Non-Goals (v1)

**Goals:** Pixel-faithful Planning hub; full CRUD for four kinds; ⌘K deep-links; predictions apply **cashflow** + **loan_redraw** (once cash credit on date).

**Non-Goals (v1 → #294):**
- Refinance / repayment-change altering prediction baseline or liability balances
- Auto-apply refinance to liabilities register
- Consolidation kind; broker export

## What each kind does in v1

| Kind | Persist | Predictions | Liabilities |
|------|---------|-------------|-------------|
| `cashflow` | yes | once amount on date | — |
| `loan_redraw` | yes | once **positive** cash on date | UI impact preview only |
| `loan_refinance` | yes | **none** | UI impact preview only |
| `loan_repayment_change` | yes | **none** | UI impact preview only |

## Decisions

1. **Table stays `planned_spending`** — add columns; avoid rename churn. API path is `/planning`.
2. **Kinds:** `cashflow` | `loan_redraw` | `loan_refinance` | `loan_repayment_change` (text check constraint).
3. **Loan columns:** `liability_id`, `financial_account_id` (redraw dest), `new_liability_name`, `interest_rate_bps`, `repayment_cents`.
4. **`total_cents`:** sum cashflow `amount_cents` only.
5. **Match/link:** reject or no-op for non-cashflow.
6. **CSS:** port `planning.css` classes into Tailwind/`cn` matching oklch mixes (accent/warn/success/fg badges).

## Risks

- [Risk] Predictions double-count if loan redraw treated as income elsewhere → Mitigation: exclude loan kinds from income KPIs; only once balance adjustment.
- [Risk] Existing clients on `/api/planned-spending` → Mitigation: alias same handlers.
- [Risk] Users expect refinance to “do something” in v1 → Mitigation: issue plan (#143 / #294); impact preview states calendar-only until apply lands.
