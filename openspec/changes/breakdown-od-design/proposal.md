## Why

The Breakdown page still uses three loud StatCards and plain % text, while Open Design already has a calmer net-first summary and share bars. Port that redesign so Breakdown matches the warm-paper product chrome.

## What Changes

- Replace period StatCards with a compact net-primary summary (income/spending as secondary detail)
- Add share bars under parent-row `% of spending`
- Align filter/header chrome with the OD Breakdown layout (warm-paper tokens, quieter money colouring)
- Keep existing behaviour: presets/custom range, expand/sort, move-group modal

## Capabilities

### New Capabilities
- `breakdown-page-chrome`: Visual layout and presentation of the Breakdown page toolbar summary and category share display

### Modified Capabilities

## Impact

- `frontend/src/pages/breakdown.tsx`
- Small shared UI helpers under `frontend/src/components/` if needed for the summary card / share cell
- Depends on warm-paper tokens from #214 (`feature/214-warm-paper-visual-redesign`)
- No API or data-model changes
