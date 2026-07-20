## 1. Summary chrome

- [x] 1.1 Add `PeriodSummary` (or equivalent) matching OD net-first card
- [x] 1.2 Wire it into `breakdown.tsx` in place of the three `StatCard`s
- [x] 1.3 Preserve hide-when-`rangeInvalid` behaviour

## 2. Share bars

- [x] 2.1 Add share cell UI (% + track/fill) for parent rows
- [x] 2.2 Colour fill from category colour when available
- [x] 2.3 Leave child rows without parent-level share bars (keep existing sub % text)

## 3. Polish & verify

- [x] 3.1 Align filter row spacing with warm-paper / OD density
- [x] 3.2 `pnpm run build` in `frontend/`
- [x] 3.3 Manual check: presets, custom range, expand Housing, sort columns
