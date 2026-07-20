## Why

Future Predictions still uses leftover dark-theme chart strokes and loud card chrome. Open Design now has a warm-paper `funds-predictions.html` prototype — port that chrome into the React page while keeping existing forecast behaviour.

## What Changes

- Compact projection summary (projected end primary; starting + monthly net detail)
- Chart panel / legend / scenario & goal lists aligned to OD warm-paper
- Light-theme chart strokes, tooltip, and semantic colours from `chartColors`
- Preserve scenarios, goals, planned markers, modals, and API behaviour

## Capabilities

### New Capabilities
- `predictions-page-chrome`: Visual layout of Future Predictions toolbar, chart panel, and scenario/goal lists

### Modified Capabilities

## Impact

- `frontend/src/pages/predictions.tsx`
- New helpers under `frontend/src/components/predictions/` as needed
- Stacks on warm-paper (#214) / breakdown (#216) branches
- No API changes
