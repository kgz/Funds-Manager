## 1. Tokens and foundation

- [ ] 1.1 Add warm-paper CSS custom properties (from OD `shared.css`) to frontend global CSS
- [ ] 1.2 Wire Tailwind theme / fonts to IBM Plex Sans + Mono and token colours; remove unused Graphik/Merriweather references
- [ ] 1.3 Replace `#root` dark slate gradient with warm-paper shell background
- [ ] 1.4 Rewrite `layout/tokens.ts` class strings for paper surfaces, ink text, hairline borders, blue accent

## 2. Shared chrome components

- [ ] 2.1 Restyle app shell + sidebar surface for warm-paper (keep current nav IA)
- [ ] 2.2 Restyle `PageShell`, `PageHeader`, `GlassCard`, `StatCard`, buttons/inputs shared tokens
- [ ] 2.3 Restyle `Modal`, `Drawer`, `SegmentedControl`, `SearchInput`, `EmptyState`, `ErrorState`, `InlineAlert`
- [ ] 2.4 Restyle shared `table` chrome for light surfaces
- [ ] 2.5 Remove or no-op dead light/dark theme toggle plumbing in `App.tsx`

## 3. Charts and KPIs

- [ ] 3.1 Replace `graphs/theme.ts` dark chart tokens with light paper-tuned colours
- [ ] 3.2 Restyle `ChartCard` and `KpiCards` for warm-paper panels
- [ ] 3.3 Spot-check dashboard Recharts (axes, grid, tooltips, legends) for contrast

## 4. Primary routes visual pass

- [ ] 4.1 Dashboard warm-paper alignment
- [ ] 4.2 Transactions (including category picker menu on paper)
- [ ] 4.3 Statements
- [ ] 4.4 Categories
- [ ] 4.5 Breakdown table/cards
- [ ] 4.6 Serviceability
- [ ] 4.7 Grep/fix leftover dark utility islands on secondary routes that share the shell

## 5. Verify

- [ ] 5.1 `pnpm run build` in `frontend/`
- [ ] 5.2 Manual QA: dashboard, transactions, statements, categories, breakdown, serviceability
- [ ] 5.3 Confirm broker-report routes still use their intentional print/paper styling
