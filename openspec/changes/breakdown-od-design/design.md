## Context

Open Design `funds-breakdown.html` defines the target Breakdown chrome: warm-paper filters row, a net-first period summary card, expandable category table with share bars. The React page already has the data/behaviour; only presentation needs to match.

This change stacks on #214 warm-paper tokens (`paper-*`, chart semantic colours).

## Goals / Non-Goals

**Goals:**
- Match OD summary treatment (net primary; income/spending secondary with dots)
- Show parent spend share as % + thin coloured bar
- Keep all existing analytics, sorting, expand, and move flows

**Non-Goals:**
- Sidebar / command palette (#215)
- Exporting OD design-system package into the repo
- Changing breakdown API payloads

## Decisions

1. **Inline summary component** in `frontend/src/components/breakdown/` rather than overloading `StatCard` — OD layout is asymmetric (net large + detail rail), not three equal cards.
2. **Share bar colour** from category `colour` when present, else `chartColors.other`.
3. **Money colouring:** net uses semantic green/red; income/spend in the detail rail stay semantic; table row money keeps existing semantic colours (product truth), not the earlier “all neutral ink” experiment for the harsh StatCards.
4. **Branch base:** `feature/214-warm-paper-visual-redesign` — Breakdown chrome requires paper tokens.

## Risks / Trade-offs

- [Stacked PR] → Merge or rebase after #214; PR base is the warm-paper branch until that lands.
- [Responsive density] → Summary stacks under filters below ~1100px, matching OD media queries.
