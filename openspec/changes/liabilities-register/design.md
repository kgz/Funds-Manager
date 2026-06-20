## Context

Funds Manager models cash flow (statements → transactions → analytics) and, recently, planned spending and predictions. It has no concept of a **debt as an entity** — loans are only visible as repayment transactions. The broker-ready report epic (#107) needs structured liabilities so it can show what is owed, to whom, at what rate, and how it's being repaid.

This change mirrors the proven **planned spending** stack: Diesel migration + model, Actix REST scope under `/api`, React page with shared layout primitives and a Redux slice/thunk pair.

## Goals / Non-Goals

**Goals:**

- Persist liabilities in **Postgres** with full CRUD from a dedicated `/liabilities` page
- Capture enough structure to later compute net worth, LVR/equity, and a debts table
- Optional link to an existing `financial_accounts` row
- Show total outstanding balance for the list

**Non-Goals:**

- Net worth / LVR / equity (separate tickets #56, #57)
- Interest accrual / offset modelling (deferred, #107)
- Auto-create from repeat payments (follow-up)

## Decisions

### 1. Persist in database

`liabilities` table in Postgres, soft-deleted via `deleted_at` (matches categories / planned_spending).

### 2. Data model

```sql
liabilities
  id                    BIGSERIAL PK
  name                  VARCHAR(200) NOT NULL      -- label, e.g. "BankSA home loan"
  kind                  VARCHAR(32)  NOT NULL      -- home_loan | car_loan | personal_loan | credit_card | bnpl | hecs | other
  lender                VARCHAR(200) NULL
  balance_cents         BIGINT NOT NULL            -- current amount owed (positive magnitude)
  credit_limit_cents    BIGINT NULL                -- cards / BNPL
  original_amount_cents  BIGINT NULL
  interest_rate_bps     INTEGER NULL               -- basis points, e.g. 6.53% = 653
  rate_type             VARCHAR(16) NULL           -- fixed | variable
  repayment_cents       BIGINT NULL
  repayment_frequency   VARCHAR(16) NULL           -- weekly | fortnightly | monthly
  term_months           INTEGER NULL               -- term remaining
  financial_account_id  BIGINT NULL FK -> financial_accounts(id) ON DELETE SET NULL
  notes                 TEXT NULL
  created_at            TIMESTAMP NOT NULL DEFAULT now()
  deleted_at            TIMESTAMP NULL
```

**Money as BIGINT/i64:** mortgages exceed the i32 cents range used by `planned_spending.amount_cents`; liabilities use `BIGINT` cents end to end.

**Rate as integer basis points:** avoids floats; 6.53% stored as `653`. UI converts to/from a percentage.

**Enums as VARCHAR + CHECK:** keeps migrations simple and avoids Postgres enum migration friction; the app validates the same set.

### 3. Constraints

- `balance_cents >= 0`
- `credit_limit_cents >= 0` when set; `original_amount_cents >= 0` when set; `repayment_cents >= 0` when set
- `interest_rate_bps >= 0` when set; `term_months >= 0` when set
- `kind` in the allowed set; `rate_type` in (`fixed`,`variable`); `repayment_frequency` in (`weekly`,`fortnightly`,`monthly`)

### 4. API shape

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/liabilities` | List active items + `total_balance_cents` |
| POST | `/api/liabilities` | Create |
| PUT | `/api/liabilities/{id}` | Partial update |
| DELETE | `/api/liabilities/{id}` | Soft-delete (204) |

JSON uses **snake_case** field names (serde default; current app convention). Partial updates use `Option<Option<T>>` for nullable clears.

### 5. Frontend UX

- Route `/liabilities`, nav label **Liabilities**, lucide icon `Landmark`
- `PageShell variant="table"`, `PageHeader` with Add action, total-owed `StatCard`
- Table: name, kind badge, lender, balance, rate, repayment
- Add/Edit `Modal`: `selectDarkClass` for kind/rate-type/frequency, `inputDarkClass` for text, monospaced money inputs (reuse planned/predictions patterns), optional account picker
- Empty / loading / error states via shared layout primitives

## Risks / Trade-offs

- **VARCHAR enums** allow invalid values if validation is bypassed → mitigated by DB CHECK + app validation.
- **No interest/offset maths** → out of scope by design; fields are captured so later tickets can compute.
- **Account link is optional and not required** → keeps quick capture easy; integrations handle nulls.

## Migration Plan

1. Ship Diesel migration + model (`diesel migration run` regenerates `schema.rs`)
2. Deploy API routes (backward compatible)
3. Ship frontend page

Rollback: migration `down` drops the table; safe pre-production.

## Open Questions

- Should `balance_cents` be auto-refreshed from a linked account's latest statement? **Deferred** — manual entry in v1.
- Per-currency support? **Deferred** — AUD assumed.
