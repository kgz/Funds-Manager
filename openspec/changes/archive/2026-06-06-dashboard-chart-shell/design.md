## Decisions

- **ChartCard**: `rounded-xl border border-white/10 bg-white/5 p-6` — matches breakdown sidebar
- **Theme object**: export `chartTheme` from `frontend/src/graphs/theme.ts` with stroke/fill/tick values
- **Tooltips**: keep per-chart custom tooltips but align container classes via shared `chartTooltipClass`

## Non-Goals

- Changing chart data or types
