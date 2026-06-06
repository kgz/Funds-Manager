## Why

The dashboard works but feels unfinished: raw checkbox, invisible drill-down, generic spinner, and plain "No data" text. Small UX fixes give the biggest perceived quality lift for least code.

## What Changes

- Styled toggle for "Group by parent category"
- Hint text on spending pie that slices are clickable
- Hover feedback on pie slices (cursor + opacity already partial)
- Rich empty state when no transactions (CTA to upload statements)
- Improved loading skeleton instead of lone spinner
- Consistent error state styling

## Capabilities

### New Capabilities

### Modified Capabilities

- `frontend`: dashboard UX requirements for loading, empty, and interaction affordances

## Impact

- `frontend/src/components/dashboard.tsx`
- `frontend/src/graphs/pie.tsx`
