# Register valuation & balance history

## Why

Net worth over time (#56) needs both sides of the balance sheet to move
realistically. Assets now track dated valuations with optional purchase price;
liabilities need the same — **balance snapshots over time**, seeded by an
**original amount + start date** at loan origination.

## What changes

### Assets (#125)
- `asset_valuations` history table; backfill from current snapshots
- Optional "bought at" on create; valuation history in edit modal
- Net worth interpolates asset values linearly between dates

### Liabilities (same PR — decision 2026-06-20)
- `liability_balances` history table; backfill from current balances
- Optional **original amount + started-at date** on create seeds the earliest snapshot
- Balance history panel in edit modal (add/remove dated snapshots)
- Net worth interpolates liability balances linearly between dates (mirror of assets)
- `balance_cents` on the liability row stays a denormalised cache of the newest snapshot

## Decisions

| Topic | Decision |
|-------|----------|
| Liability history scope | In scope for #125 / PR #124 — not deferred to a follow-up |
| Interpolation | Linear between consecutive snapshots (same as assets) |
| Chart x-axis | Time scale so sparse early years aren't squashed |
| Automated amortisation | Out of scope — manual snapshots only for now |

## Impact

- Builds on #108 (liabilities), #109 (assets), #56 (net worth)
- Out of scope: liability balance history, automated market valuations
