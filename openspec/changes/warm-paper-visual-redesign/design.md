## Context

The SPA is hard-coded to a dark glass aesthetic (`layout/tokens.ts`, `#root` slate gradient in `App.css`, white-on-dark `graphs/theme.ts`). There is no real CSS-variable theme; a light/dark toggle in `App.tsx` is effectively dead. Open Design **Funds Manager Redesign** (`funds-manager-redesign-5e1b`) defines the target warm-paper system in `css/shared.css` (oklch tokens, IBM Plex, hairline borders, blue accent).

GitHub #214 is step 1 before sidebar IA + command palette (#215).

## Goals / Non-Goals

**Goals:**
- Make warm-paper the default (and only) product chrome for the authenticated SPA shell.
- Centralize tokens so pages inherit the new look via shared components.
- Restyle charts, KPIs, tables, and forms for light surfaces.
- Match OD prototypes on primary QA routes without changing behaviour or nav IA.

**Non-Goals:**
- Progressive groups + ⌘K command palette (#215).
- Redesigning broker-report print/share documents (already paper-oriented).
- Implementing a dual light/dark toggle for this change.
- Brand/logo naming work.
- Full mobile IA redesign (#41) beyond what shared chrome naturally provides.

## Decisions

### 1. Token source of truth: CSS variables + thin Tailwind mapping
Map OD `:root` tokens (`--bg`, `--surface`, `--fg`, `--muted`, `--border`, `--accent`, fonts, radius) into `index.css` / `App.css`, and point Tailwind theme colours / layout token classes at those variables.

**Alternatives considered:** Rewrite every class string ad hoc — rejected (unmaintainable). Replace Tailwind with only custom CSS — rejected (too disruptive).

### 2. Replace glass tokens, keep component API
Keep `PageShell`, `PageHeader`, `GlassCard` (name may stay; surface becomes solid paper panel), `StatCard`, `ChartCard`, `Modal`, `Drawer`, `SegmentedControl`, etc. Change class tokens in `layout/tokens.ts` and component wrappers rather than inventing a parallel component tree.

**Alternatives considered:** New `PaperCard` alongside `GlassCard` — rejected for this ticket (double chrome). Rename everything in one PR — optional follow-up, not required for #214.

### 3. Single light product theme; remove dead toggle behaviour
Ship warm-paper only. Remove or no-op the unused theme switcher wiring so specs no longer require a light/dark preference toggle. localStorage theme keys may be ignored/cleared.

**Alternatives considered:** Keep dual theme — rejected until there is a designed dark variant in OD.

### 4. Typography: load IBM Plex Sans + Mono
Load via Google Fonts (as OD) or self-host if preferred for offline installs; wire Tailwind `font-sans` / `font-mono` to Plex. Drop unused Graphik/Merriweather config references.

### 5. Charts: light theme tokens
Replace `graphs/theme.ts` dark whites with muted ink/grid colours tuned for paper surfaces. Keep Recharts structure and chart behaviour.

### 6. Scope of page polish
Primary QA routes get explicit visual pass. Secondary routes inherit via shared tokens/chrome; fix one-off dark leftovers when they break readability, without deep page redesigns.

### 7. Design reference
Treat OD HTML prototypes as visual reference, not as code to copy wholesale. React + Tailwind remain the implementation stack.

## Risks / Trade-offs

- **[Risk]** Scattered `text-white/*` / `bg-gray-950` outside shared tokens leave dark islands → **Mitigation:** grep for common dark utilities after token swap; fix primary routes first, then secondary leftovers.
- **[Risk]** Category colour dots / charts rely on white backgrounds for contrast → **Mitigation:** verify category colours and donut legends on paper surfaces.
- **[Risk]** Broker report accidentally restyled → **Mitigation:** leave report CSS/routes out of shared shell token sweeps unless they import layout tokens.
- **[Trade-off]** No dark mode until a future designed variant exists.
- **[Trade-off]** `GlassCard` name becomes misleading — acceptable for #214; rename later if desired.

## Migration Plan

1. Land tokens + shell chrome on feature branch.
2. Update chart theme + primary pages.
3. `pnpm run build` in `frontend/`; manual QA routes from #214.
4. Merge; #215 builds on warm-paper chrome.
5. Rollback: revert PR (visual-only; no migrations).

## Open Questions

- None blocking implementation; secondary-route leftover cleanup can be incremental inside the same PR if low-cost.
