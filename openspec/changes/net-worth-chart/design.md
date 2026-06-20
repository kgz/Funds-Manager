## Context

The dashboard balance chart derives a per-account balance series from `transaction_data.balance` with a SQL carry-forward (latest balance on or before each transaction day, summed across accounts). #108 and #109 added liabilities and assets registers, but those hold only a **current** value (liabilities) or a point-in-time valuation (assets) — no historical series. Net worth over time must combine the real balance history with these registers.

## Goals / Non-Goals

**Goals:**

- A net-worth time series for the dashboard, reusing the proven balance-carry-forward SQL
- A response shape that can later carry an asset-class breakdown without breaking clients
- Respect the global account filter and dashboard period selector

**Non-Goals:**

- Equity/LVR (#57), forecasting, per-asset-class stacking (v1)

## Decisions

### 1. Net worth definition (v1)

```
netWorth(t) = availableCash(t) + assetsTotal − liabilitiesTotal
```

- `availableCash(t)`: existing balance series — per bank-account latest `transaction_data.balance` as of day `t`, summed (signed; offset/loan bank accounts already net in here).
- `assetsTotal`, `liabilitiesTotal`: **flat** sums of the current values from the registers.

### 2. Flat carry-back for manual registers

Manual assets/liabilities have no history, so their **current totals are applied as a constant across the whole range**. This keeps a single continuous net worth line; the trend's *shape* is driven by real cash/loan movement, while assets/liabilities shift the *level*. Documented as an explicit assumption.

**Alternative considered:** contribute from `valued_at`/created date forward — rejected for v1 (introduces misleading step jumps with no real history behind them).

### 3. Account filter behaviour

Manual assets/liabilities are **not** account-scoped. When the filter selects a single account, the series shows that account's cash balance only and `assetsTotal`/`liabilitiesTotal` are `0` (net worth across all holdings is only meaningful for "All accounts"). Documented in the UI hint.

### 4. Carry-forward / missing months

Reuse the dashboard balance SQL exactly: the series has a point per day that has any transaction in range, each carrying the last known balance per account. Months without statements inherit the last known closing balance (carry-forward). No calendar zero-fill.

### 5. API shape

`GET /api/analytics/net-worth?start=&end=&account_id=` →

```json
[ { "date": "2026-01-31", "availableCash": 8421.0, "assets": 665000.0, "liabilities": 312000.0, "netWorth": 361421.0 } ]
```

Dollars as `f64`, camelCase — matching the existing analytics module convention. Component fields make later asset-class breakdown additive.

### 6. Frontend

- New `net-worth.tsx` chart (area/line) on the dashboard, below the balance chart.
- Subscribes to the same `period` + `useAccountFilter` as the dashboard; fetches via `fetchNetWorthOverTime`.
- Tooltip shows net worth and the cash/assets/liabilities components; y-axis currency; handles negative net worth.
- Legend placeholder note that asset-class breakdown is coming.

## Risks / Trade-offs

- **Flat assets/liabilities** shift the level uniformly — acceptable; trend shape preserved. Mitigated by component tooltip + documented assumption.
- **No history before first statement** — series starts where balance history exists; users with only manual assets and no statements see an empty chart (edge case).

## Migration Plan

Additive endpoint + chart; no schema changes, no data migration.

## Open Questions

- Per-asset-class stacked breakdown? **Deferred** (response shape ready).
- Snapshot history for registers? **Deferred**.
