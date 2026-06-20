## Context

```
History                    Inputs (#97)                 Output
────────                   ────────────                 ──────
Transactions ──┐
Repeat payments├─► Baseline engine ──► Balance path ──► Chart + goal gap
Planned spend ─┘         ▲
                         │
              Scenarios (adjustment lines)
```

Funds Manager already exposes balance series and KPIs via analytics APIs, repeat patterns on `/recurring` (client-side detection), and planned spending via `/api/planned-spending`. There is no forward projection today (#29).

## Goals / Non-Goals

**Goals:**

- Project balance forward over a selectable horizon
- Let users add/compare multiple named scenarios
- Show savings goals with gap and suggested monthly contribution
- Plain-language UI

**Non-Goals:**

- Tax, returns, multi-account rollup (#56)
- Server-side repeat detection (keep client detection for v1; pass patterns to forecast API or compute baseline client-side — see decision 4)
- Prorated planned spending across months (use dated items as in #96 v1)

## Decisions

### 1. Route and nav

**Choice:** `/predictions`, nav label **Future predictions**, icon `TrendingUp` or `LineChart`.

### 2. Persistence

**Choice:** Postgres for `prediction_scenarios`, `prediction_scenario_lines`, `prediction_goals`.

**Rationale:** Matches planned spending; scenarios/goals are user data worth backing up. localStorage rejected for same reasons as #96.

**Schema (v1):**

```sql
prediction_scenarios
  id, name, created_at, deleted_at

prediction_scenario_lines
  id, scenario_id FK, name, amount_cents (signed like transactions),
  frequency ENUM-like text: 'once' | 'weekly' | 'fortnightly' | 'monthly' | 'yearly',
  start_date, optional end_date, optional category_id, sort_order

prediction_goals
  id, name, target_amount_cents, target_date, created_at, deleted_at
```

Global (no account FK) in v1, same as planned spending.

### 3. Baseline algorithm (v1)

**Choice:** Monthly steps from **today** to horizon end:

1. **Starting balance** — latest total from analytics balance series (respect account filter when set; else all accounts).
2. **Baseline monthly net** — average of `(income − spending)` over last 3 complete months (or available history if shorter), from analytics monthly summary.
3. **Repeat payments** — for each accepted pattern from recurring detection, apply expected amount on schedule within horizon (monthly bucket).
4. **Planned spending** — apply `amount_cents` on `start_date` when in horizon (from planned spending API).
5. **Projected balance** — cumulative sum per month endpoint.

Document in UI: “Estimate based on recent averages, repeat payments, and planned items.”

**Alternatives:** Pure linear regression on balance (rejected — less intuitive); full daily simulation (defer).

### 4. Where baseline runs

**Choice:** `GET /api/predictions/baseline?from&to&account_id` returns monthly points + metadata. Server loads transactions/analytics helpers, repeat patterns submitted in body **or** server reuses planned spending only and client merges repeat lines.

**Pragmatic v1 split:** Server computes balance path from DB trends + planned spending. **Client** merges in repeat-payment adjustments from existing recurring detection (already on device) when calling baseline or in a second merge step. Document in tasks.

**Rationale:** Repeat detection is client-only today; moving it server-side is out of scope.

### 5. Scenarios on chart

**Choice:** Baseline line + one line per selected scenario (user toggles). Scenario = baseline + sum of scenario line effects applied with same frequency rules.

### 6. Goals

**Choice:** For each goal, find projected balance at `target_date` on selected scenario (default baseline). Show:

- `gap = target_amount_cents − projected_balance_cents` (interpretation: user wants balance **at least** target — clarify in UI copy)
- `months_remaining` → `suggested_monthly = gap / months` (if gap > 0)

Use **target balance** semantics (not “save X total by date” unless amount is defined that way in UI).

### 7. Horizon selector

Reuse period patterns from planned/breakdown: presets 3 / 6 / 12 months forward + custom end date. Default 6 months.

## Risks / Trade-offs

- **Repeat payments client-only** — baseline without repeats until client merges; API contract must allow optional `repeat_adjustments[]` payload on baseline POST or separate endpoint.
- **Monthly bucketing** — weekly repeats approximated to monthly (document).
- **Large scope** — ship baseline + one scenario + goals in tasks order; chart comparison before polish.

## Open Questions

- Goal semantics: target **balance** vs **amount to save**? **Default: target balance at date.**
- Close #29 when this ships? **Yes, reference in PR.**
