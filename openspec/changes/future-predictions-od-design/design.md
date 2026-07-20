## Context

OD artifact: `funds-predictions.html` + `css/predictions.css` in Funds Manager Redesign. React page at `/predictions` already has full data wiring.

## Goals / Non-Goals

**Goals:**
- Match OD toolbar summary, panel titles, entity lists, chart legend treatment
- Fix remaining dark-theme chart chrome (grid, axes, tooltip, cyan baseline)

**Non-Goals:**
- New forecasting algorithms
- Redesigning modal form logic beyond light visual polish
- Sidebar command palette (#215)

## Decisions

1. Reuse PeriodSummary-style rail for projection summary (`ProjectionSummary`).
2. Keep Recharts; swap colours to `chartColors` / paper border tokens.
3. Scenario toggle stays Show/Hide (or checkbox) without changing toggle state model.

## Risks / Trade-offs

- [Stacked on unmerged redesign branches] → PR base is redesign stack until #214/#216 land.
