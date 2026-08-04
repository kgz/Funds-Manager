## Context

Repeat payments detects recurring debits/credits from imported transactions. The React page (`recurring.tsx`) already implements pattern vs category grouping, account filter, min-occurrences threshold, expandable category sections, and monthly spend/income estimates. OD HTML does not exist yet; Income and Breakdown are the closest references.

## Goals / Non-Goals

**Goals**
- OD prototype `funds-repeat-payments.html` mirroring production behaviour
- React port: flat `page-header`, `page-body`, panel table, OD tokens, semantic money colours
- Preserve all existing API behaviour and interactions

**Non-Goals**
- Changing repeat-detection algorithm or API
- Multi-select account filter (#254) unless already shared component is trivial to wire

## Decisions

1. **Layout** — `PageShell variant="table"` + sticky flat header (title/subtitle left, filters right). Body: optional 2-col KPI strip (monthly spending / monthly income), then single panel with table.
2. **Filters row** — Account select, segmented `By pattern | By category`, min-occurrences `<select>` (3–6). Same segmented control component as dashboard/breakdown.
3. **Table** — Reuse OD `table.data` styling from income/breakdown: uppercase muted headers, expandable chevron for category mode, category pills, mono amounts with `--danger`/`--success`.
4. **Help** — Icon/button in header actions opening existing help content (drawer or inline callout); OD shows a quiet `?` ghost button.
5. **Money colours** — `moneySemantics.ts` helpers only; no `text-green-400` / `text-red-300`.

## Risks / Trade-offs

- Category grouped view is dense → keep 13px table type and sticky header within panel scroll
- OD design run may need iteration if table columns differ from React → spec lists canonical columns from current page

## Open Questions

- None blocking; confirm OD column order after design run lands
