## Context

Funds Manager today is **historical**: statements → transactions → analytics. Repeat payments (#95) infers patterns; it does not capture things the user **knows are coming** but have not happened yet.

Issue **#96** asks for a planned spending area. **#97** will need planned amounts as forecast inputs. The app already uses Postgres + Diesel migrations, Actix REST APIs, and React pages with shared layout primitives (`PageShell`, `PageHeader`, `Modal`, `GlassCard`).

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Transactions   │     │ Repeat payments  │     │ Planned spending│
│  (actual past)  │     │ (inferred past)  │     │ (user future)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                        │                         │
         └────────────────────────┴─────────────────────────┘
                                  │
                          Future: #97 predictions
```

## Goals / Non-Goals

**Goals:**

- Persist planned items in **Postgres** (not localStorage)
- Full CRUD from a dedicated `/planned` page
- Show **total planned spend** for a selected period (month default, custom range)
- Optional category link for reporting consistency
- Respect global **account filter** where relevant (see decision below)

**Non-Goals:**

- Dashboard widgets / chart overlays (defer)
- Import/export planned items
- Automatic creation from repeat payments
- Auth / multi-tenant concerns

## Decisions

### 1. Persist in database (not local-only)

**Choice:** `planned_spending` table in Postgres.

**Rationale:** Survives browser refresh, same backup story as transactions, ready for #97 API consumption. Local-only would require a later migration pain.

**Alternatives considered:** `localStorage` MVP — rejected because predictions need server-side data.

### 2. Data model

```sql
planned_spending
  id              BIGSERIAL PK
  name            VARCHAR NOT NULL
  amount_cents    INTEGER NOT NULL   -- positive spend; sign convention matches expenses
  start_date      DATE NOT NULL
  end_date        DATE NULL          -- NULL = single-day item
  category_id     INTEGER NULL FK -> categories.id ON DELETE SET NULL
  notes           TEXT NULL
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  deleted_at      TIMESTAMPTZ NULL     -- soft delete, matches categories pattern
```

**Period overlap rule:** An item counts toward a `[range_start, range_end]` query when its date span overlaps the range:

- Single day: `start_date` within range
- Range: `start_date <= range_end AND (end_date IS NULL OR end_date >= range_start)`

**Amount in totals:** Use full `amount_cents` once per item if it overlaps the period (not prorated by days in v1 — simpler, documented in UI).

### 3. Account scoping

**Choice:** `planned_spending` rows are **global** (no `financial_account_id` in v1).

**Rationale:** Planned items are often cross-account (holiday, renovation). Account filter on the page can remain visible for consistency but does not filter planned rows until we add optional account FK later.

**Open for #97:** optional `financial_account_id` column.

### 4. API shape

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/planned-spending` | List active items; query `from`, `to` (ISO dates) for overlap filter + `total_cents` in response meta |
| POST | `/api/planned-spending` | Create |
| PUT | `/api/planned-spending/{id}` | Update |
| DELETE | `/api/planned-spending/{id}` | Soft-delete |

JSON uses camelCase in API responses (existing convention).

### 5. Frontend UX

- Route: `/planned`, nav label **Planned spending**, icon `CalendarRange` (lucide)
- Page layout: `PageHeader` + period controls (month picker + custom from/to, reuse patterns from breakdown)
- Table: name, amount, dates, category pill, notes preview
- Add/Edit: `Modal` form (same patterns as categories/accounts)
- Empty state when no items
- Summary stat card: **Planned total** for selected period

### 6. Category link

**Choice:** Optional `category_id` FK.

**Rationale:** Aligns planned spend with breakdown categories; nullable for quick captures.

## Risks / Trade-offs

- **No proration** — A $3k holiday spanning two months shows full amount in each overlapping month if user views each month. → Mitigation: document in help text; add proration in a follow-up if needed.
- **Global vs per-account** — Account filter does not affect planned list in v1. → Mitigation: note in UI; add FK later if users ask.
- **Overlap with #33** — Trip mode may subsume some use cases. → Keep #96 minimal; link issues.

## Migration Plan

1. Ship Diesel migration + model
2. Deploy API routes (backward compatible)
3. Ship frontend page
4. No backfill required (empty table)

Rollback: migration down drops table; safe if no production data yet.

## Open Questions

- Prorate multi-day items across months? **Deferred** (full amount in v1)
- Show planned total on dashboard? **Deferred** (#96 optional deliverable)
- `financial_account_id` on planned rows? **Deferred** to #97 / #103 era
