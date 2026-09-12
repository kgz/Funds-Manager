## 1. Database

- [x] 1.1 Migration: `plan_kind`, `liability_id`, `financial_account_id`, `new_liability_name`, `interest_rate_bps`, `repayment_cents` + checks
- [x] 1.2 Update `schema.rs` and `PlannedSpending` / New / Changes models
- [x] 1.3 Validation helpers per kind; `total_cents` cashflow-only
- [x] 1.4 Predictions: cashflow as today; redraw once credit on date

## 2. API

- [x] 2.1 Mount `/api/planning` with same routes; alias `/api/planned-spending`
- [x] 2.2 Create/update payloads accept kind + loan fields; list returns them
- [x] 2.3 Match/resolve reject non-cashflow
- [x] 2.4 Update AI catalog paths to `/api/planning`

## 3. Frontend shell

- [x] 3.1 Route `/planning` + redirect `/planned`; nav label Planning
- [x] 3.2 Types/API client paths → `/api/planning` (keep type module name or rename carefully)
- [x] 3.3 Command palette: four kind actions with `?add=<kind>`

## 4. Planning page (OD fidelity)

- [x] 4.1 Header copy, Add plan CTA, kind tabs All|Cashflow|Loans
- [x] 4.2 Kind badges (cashflow/redraw/refinance/repayment colours)
- [x] 4.3 Table columns: kind, liability, detail; account filter behaviour per PLANNING.md
- [x] 4.4 KPI: cashflow planned total only
- [x] 4.5 Add/edit modal: kind picker, conditional fields, impact preview, not-income callout
- [x] 4.6 Match callout + link actions cashflow-only
- [x] 4.7 Empty education state; deep-link `?add=` kinds
- [x] 4.8 Port planning.css token mixes (warn/accent/success) into page classes

## 5. Verify

- [x] 5.1 `cargo test` database + app as applicable
- [x] 5.2 Frontend typecheck/build
- [x] 5.3 Manual compare vs OD `funds-planning.html` (badges, modal, filters)

## 6. Docs + e2e

- [x] 6.1 User guide Planning page - effects + cross-links
- [x] 6.2 Screenshots + screenshots.manifest.json
- [x] 6.3 Playwright e2e (`planning-hub.spec.ts` + docs screenshots)
- [x] 6.4 Dead-end review: refinance/repayment follow-up #294; redraw liabilities TO COME in docs
- [x] 6.5 `cd docs-site && pnpm build`
