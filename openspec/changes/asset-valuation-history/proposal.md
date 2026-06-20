# Asset valuation history + purchase price

## Why

Assets carry a single current value, so the net worth chart (#56) holds them
flat across time. A real net worth trend — and a credible broker report — needs
each asset to track **multiple valuations over time**, seeded by a **purchase
price + date** so tracking starts from when the asset was bought.

## What changes

- New `asset_valuations` history table (`asset_id`, `valued_at`, `value_cents`,
  `source`), soft-deletable. Existing assets are backfilled with one valuation
  from their current snapshot.
- An asset's `value_cents`/`valued_at`/`value_source` become a denormalised
  cache of its newest valuation, recomputed whenever valuations change.
- Asset creation gains an optional "bought at" (purchase price + date) that seeds
  the earliest valuation.
- Nested valuations API: list/add/remove under `/api/assets/{id}/valuations`.
- Asset edit UI manages valuation history; value is edited via valuations.
- Net worth chart sums each asset's latest valuation as of each date
  (per-asset carry-forward) instead of a flat current total.

## Impact

- Affected specs: assets, api, frontend
- Builds on #108 (liabilities), #109 (assets), #56 (net worth)
- Out of scope: liability balance history, automated market valuations
