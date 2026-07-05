## Why

Snapshots (#114) and coverage (#115) freeze broker figures at capture time. Users still need a **deliverable** — a dated, professional report they can hand to a broker/lender, with optional redaction and one-off explanations (#107 surface ticket).

## What Changes

- **Report renderer** from an immutable snapshot: print-friendly layout with disclaimer, as-at date, data sources, and all payload blocks (income, lender expenses, serviceability, assets, liabilities, net worth, coverage)
- **Shareable read-only link** per snapshot (opaque token, revocable) — public browser view, no login
- **PDF export** via print-ready CSS + browser print / Save as PDF
- **Redaction** before share/export: hide account numbers (default on), optional merchant/description patterns
- **Annotations** on snapshot: note one-off transactions and flag exclude-from-analysis (stored separately from immutable payload; applied at render)
- Net worth trend chart embedded in report view

## Capabilities

### New Capabilities

- `broker-report`: share tokens, public read API, report render page, redaction + annotations, PDF/print export

### Modified Capabilities

- `api`: share/annotation endpoints; unauthenticated public report fetch by token
- `frontend`: report builder UI from snapshot detail, public `/r/:token` route, print stylesheet
- `report-snapshots`: link to generate/share report; annotation management

## Impact

- Migration: `broker_report_shares`, `broker_report_annotations`
- `database/src/models/broker_report.rs` (share + annotation)
- `app/src/routes/broker_report.rs`, public scope
- `frontend/src/pages/broker-report/` (render, public, print)
- Extend `report-snapshots/detail.tsx` with Share / Export / Annotate actions

## Out of scope (this change)

- Account conduct block (#113) — placeholder section until that ticket lands
- Server-side PDF generation (headless Chrome) — browser print is sufficient for v1
- Email delivery of share links

Closes #117. Part of broker milestone #107.
