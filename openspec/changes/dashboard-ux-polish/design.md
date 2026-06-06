## Context

Dashboard already has a polished breakdown sidebar. Main chart area lacks the same attention.

## Goals

- Make interactive elements obvious
- Guide new users when data is empty
- Match sidebar visual language (borders, `white/10`, rounded-md)

## Non-Goals

- New data or API calls
- Chart type changes (donut, layout) — separate changes

## Decisions

- **Toggle**: pill-style button group or switch component using existing Tailwind tokens (`secondary-default`, `white/10` borders) — no new UI library
- **Empty state**: icon + short copy + link to `/statements` via React Router `Link`
- **Loading**: 3–4 pulse skeleton blocks approximating KPI row + chart heights (even before KPI cards land, skeleton is generic enough)

## Risks

- Skeleton layout may shift when `dashboard-kpi-cards` lands — acceptable, tweak then
