# Planning hub — eng port notes

Prototype: `funds-planning.html` · route concept `/planning` · API target **`/api/planning`** (rename from `/api/planned-spending`).

## Plan kinds

| `kind` | UI label | Purpose |
|--------|----------|---------|
| `cashflow` | Cashflow | Dated spend/income with optional category; link-to-transaction stays here |
| `loan_redraw` | Redraw | Amount + date + liability + destination account; **not income** |
| `loan_refinance` | Refinance | Settle/close old liability + new/linked liability name + rate + repayment from date |
| `loan_repayment_change` | Repayment | Liability + new repayment (and optional rate) from date |

Kind filter tabs: **All** | **Cashflow** (`cashflow`) | **Loans** (all `loan_*`).

## Key fields (shared)

- `id`, `kind`, `name`, `date`, `notes`
- Cashflow total KPI sums **cashflow amounts only** (loan events are balance-sheet / terms, not P&L)

## Cashflow fields

- `amount` (signed: negative spend, positive income)
- `categoryId` (optional)
- `linked[]` — transaction links / match suggestions (cashflow only)

## Loan redraw fields

- `amount` — redraw size (positive magnitude)
- `liabilityId` — facility redrawn from
- `destAccountId` — account credited
- Impact: destination **+amount** · liability balance **+amount** · copy: not income

## Loan refinance fields

- `liabilityId` — facility to settle/close
- `newLiabilityName` — new or linked facility label (prototype; eng may use `newLiabilityId`)
- `rate`, `repayment` — terms from `date`
- `amount` — settling balance snapshot (from liability in prototype)

## Loan repayment change fields

- `liabilityId`
- `repayment` (required), `rate` (optional)
- `amount` mirrors new repayment for list display

## Account filter behaviour

- **All / Cashflow:** account control is **context only** — cashflow plans are global
- **Loans:** filters **redraw** rows by `destAccountId`; other loan kinds ignore account unless product later scopes them

## Sidebar

Nav id `planning` → `funds-planning.html`, label **Planning**. Legacy `funds-planned-spending.html` retained for reference until removed.

## Command palette (must initiate, not just navigate)

Each action opens Planning **and** starts Add plan with the kind pre-selected:

| Command id | Label | Deep link |
|------------|-------|-----------|
| `add-plan-cashflow` | Add cashflow plan | `/planning?add=cashflow` |
| `add-plan-redraw` | Add loan redraw | `/planning?add=loan_redraw` |
| `add-plan-refinance` | Add refinance plan | `/planning?add=loan_refinance` |
| `add-plan-repayment` | Add repayment change | `/planning?add=loan_repayment_change` |

Also accept legacy `?add=1` → open Add plan on default kind (`cashflow`).

Eng port: same contract for React ⌘K — `navigate` + page `useSearchParams` must call `openAddModal()` / `setPlanKind`, then strip the query (see Statements `?upload=1` and current Planned `?add=1`).
