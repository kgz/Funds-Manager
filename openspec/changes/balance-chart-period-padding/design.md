## Approach

Mirror `net_worth_over_time`: replace `SELECT DISTINCT day FROM balance_tx` with `bounds` + `generate_series(start_day, end_day, '1 day')`.

- When `$1` / `$2` are set: grid is exactly the dashboard period
- When null (**All time**): `COALESCE($1, MIN(day))` … `COALESCE($2, MAX(day))` from `balance_tx`
- Per-day balance: latest transaction per account scope on or before that day (existing carry-forward logic)

Both `balance_series` and `balance_stack` queries share the same `days` CTE pattern.

## Out of scope

- Frontend changes (axis already uses row dates)
- Net worth chart (already padded)
