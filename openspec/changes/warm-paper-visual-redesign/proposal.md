## Why

The live SPA still uses the hard-coded dark glass theme from early dashboard polish (#2 / #32). Open Design **Funds Manager Redesign** defines a clearer warm-paper / modern-minimal system that should become the product chrome before further IA work (#215).

## What Changes

- Replace the always-dark glass visual system with the warm-paper design language (paper surfaces, hairline borders, single restrained blue accent, IBM Plex typography).
- Introduce shared design tokens (CSS variables and/or Tailwind theme) derived from the OD prototype `css/shared.css`.
- Restyle shared layout chrome: app shell, sidebar surface, page header, cards/panels, KPIs, tables, forms, modals/drawers, empty/error states.
- Restyle charts for the light surface (axes, grids, tooltips) and retire dark-theme chart requirements.
- Align primary routes (dashboard, transactions, statements, categories, breakdown, serviceability) to the prototype look without changing product behaviour or nav IA.
- Remove or neutralize dead light/dark toggle plumbing that does not drive a real theme system.
- **BREAKING** (visual only): users accustomed to the dark UI will see a new light chrome; no API or data model changes.

## Capabilities

### New Capabilities

- `warm-paper-theme`: Visual design system tokens and shared chrome requirements for the warm-paper redesign (surfaces, typography, accent, chart theming, primary-route visual alignment).

### Modified Capabilities

- `frontend`: Replace dark-theme chrome / chart / table / GlassCard requirements with warm-paper equivalents; keep behavioural requirements unchanged.

## Impact

- **Frontend**: `tailwind.config.ts`, `App.css` / `index.css`, `layout/tokens.ts`, shell components (`sidebar`, `PageShell`, `PageHeader`, `GlassCard`, `StatCard`, `ChartCard`, `KpiCards`, table, modal/drawer), `graphs/theme.ts`, primary pages under `frontend/src/pages/`.
- **Out of scope**: progressive sidebar + ⌘K (#215); broker-report print surfaces remain intentional paper documents; nav IA grouping behaviour stays as today until #215.
- **Backend / API**: none.
- **GitHub**: Closes #214; unblocks #215.
