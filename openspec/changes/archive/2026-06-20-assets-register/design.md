## Context

#108 introduced a liabilities register so the app can hold structured debts. To produce a net worth figure and a broker report, the app also needs the asset side: property, vehicles, super, and balances sitting outside the imported statements. This change mirrors the liabilities stack (Diesel migration + model, Actix REST scope, React page + Redux slice/thunk).

## Goals / Non-Goals

**Goals:**

- Persist assets and external balances in Postgres with full CRUD from `/assets`
- Record a valuation date + source so figures are auditable for a broker
- Allow a property asset to reference its loan (a `liabilities` row) so #57 can derive equity/LVR
- Show total asset value and flag stale valuations

**Non-Goals:**

- Net worth (#56) / LVR (#57) computation — this change only stores data
- Market-data/valuation automation
- Broker report rendering (#117)

## Decisions

### 1. Single `assets` table for assets and external balances

An "external balance" (e.g. savings at another bank) is modelled as an asset with `kind = savings`/`investment`, rather than a separate table. Keeps the model and UI simple; net worth (#56) just sums all active assets.

### 2. Data model

```sql
assets
  id            BIGSERIAL PK
  name          VARCHAR(200) NOT NULL          -- label, e.g. "123 Main St", "Hostplus Super"
  kind          VARCHAR(32)  NOT NULL          -- property | vehicle | super | savings | investment | other
  value_cents   BIGINT NOT NULL                -- current value (>= 0)
  valued_at     DATE NULL                      -- "value as at" date
  value_source  VARCHAR(200) NULL              -- e.g. "council rates notice", "owner estimate"
  liability_id  BIGINT NULL FK -> liabilities(id) ON DELETE SET NULL   -- property → home loan
  notes         TEXT NULL
  created_at    TIMESTAMP NOT NULL DEFAULT now()
  deleted_at    TIMESTAMP NULL
```

Money is `BIGINT`/i64 cents (property values exceed the i32 range), matching liabilities.

### 3. Constraints

- `value_cents >= 0`
- `kind` in the allowed set (CHECK + app validation)

### 4. API shape

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/assets` | List active items + `total_value_cents` |
| POST | `/api/assets` | Create |
| PUT | `/api/assets/{id}` | Partial update |
| DELETE | `/api/assets/{id}` | Soft-delete (204) |

JSON uses snake_case; partial updates use `Option<Option<T>>` for nullable clears. `liability_id` is validated against an existing liability when provided.

### 5. Frontend UX

- Route `/assets`, nav label **Assets**, lucide icon `Building2`
- `PageShell variant="table"`, total-value `StatCard`
- Table: name, kind badge, value, valued-at (with stale badge when older than 12 months), source
- Add/Edit `Modal`: kind select, value input, valuation date + source, optional property→loan link (only meaningful for property), notes

### 6. Stale-valuation flag

Computed on the client: if `valued_at` is null or older than 12 months, show an amber "stale" badge prompting a refresh. No backend field needed.

## Risks / Trade-offs

- **Single table for mixed asset types** — fields like `liability_id` only apply to property. Acceptable; nullable and ignored for other kinds.
- **No valuation history** — only the latest value is stored. History is out of scope; `valued_at` captures recency.

## Migration Plan

1. Ship Diesel migration + model (`schema.rs` updated to match)
2. Deploy API routes
3. Ship frontend page

Rollback: migration `down` drops the table.

## Open Questions

- Should net worth subtract a property's linked loan automatically? **Deferred** to #57.
- Per-currency support? **Deferred** — AUD assumed.
