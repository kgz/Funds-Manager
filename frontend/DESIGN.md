# Frontend design tokens

Reference implementation: `src/components/dashboard.tsx`.

## Surfaces

- Glass card: `rounded-xl border border-white/10 bg-white/5`
- Page padding: `p-4 md:p-6`
- App content offset: `ml-16 lg:ml-64` (sidebar)

## Typography

- Page title: `text-2xl font-semibold text-white`
- Page subtitle: `text-sm text-white/60`
- Section label: `text-xs uppercase tracking-wide text-white/50`

## Shared components

`src/components/layout/`:

| Component | Use |
|-----------|-----|
| `PageShell` | Page wrapper (`default` or `table` full-height) |
| `PageHeader` | Title, subtitle, actions; optional sticky + pending bar |
| `GlassCard` | Base surface |
| `EmptyState` | Icon + message + optional CTA |
| `ErrorState` | Full-page recoverable error |
| `PageLoadingState` | Full-page or in-card loading |
| `InlineAlert` | Error / warning / info banner |
| `SearchInput` | Dark-theme search field |
| `StatCard` | KPI / summary box |
| `Modal` | Dialog overlay + glass panel |

Import tokens from `layout/tokens.ts` when building one-off UI.

## Deprecated

`src/components/ui/*` — light-theme boilerplate, unused. Prefer `layout/` primitives.

## Colours

From `tailwind.config.ts`:

- `secondary.default` — accent purple (`#a287cd`)
- Spending: `text-red-300` / `text-red-400`
- Income: `text-green-400` / `text-emerald-400`

## Charts

- Wrapper: `ChartCard`
- Tooltip: `chartTooltipClass` in `src/graphs/theme.ts`
