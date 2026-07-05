## Context

`broker_report_snapshots` stores immutable payload v2 (income, lender expenses, serviceability, assets, liabilities, net worth, coverage). Detail UI already renders key tables from payload. #117 turns that into an exportable, shareable broker deliverable.

App has no authentication — share links rely on unguessable tokens; users must treat links as secrets.

## Goals / Non-Goals

**Goals:**

- Render full broker report from stored snapshot only (no live recompute)
- Create/revoke share links with optional redaction JSON
- Public `GET /api/public/broker-reports/{token}` returns snapshot metadata + payload + annotations + redaction (404 if revoked/unknown)
- Annotation CRUD scoped to snapshot (transaction id + note + `exclude_from_analysis`)
- Print-friendly report page with disclaimer footer
- Net worth line chart from payload `netWorth.points`

**Non-Goals:**

- Conduct metrics (#113)
- Refinance scenario block (#116)
- Patching snapshot payload after capture
- Server-rendered PDF binary

## Decisions

### 1. Share storage

Table `broker_report_shares`:

| column | purpose |
|--------|---------|
| `snapshot_id` | FK → `broker_report_snapshots` |
| `token` | `TEXT` unique, UUID v4 |
| `redaction` | `TEXT` JSON (`hideAccountNumbers`, `hiddenMerchantPatterns[]`) |
| `created_at`, `revoked_at` | audit |

One snapshot may have multiple shares (e.g. different redaction). Revoke sets `revoked_at`.

### 2. Annotations

Table `broker_report_annotations`:

| column | purpose |
|--------|---------|
| `snapshot_id` | FK |
| `transaction_id` | FK → `transaction_data` (nullable for free-text notes later) |
| `note` | user explanation |
| `exclude_from_analysis` | bool — surfaced in report, excluded flag for broker |
| `created_at`, `deleted_at` | soft delete |

Annotations are **not** in snapshot payload; render merges at read time.

### 3. Redaction application

At render (share + authenticated detail):

- `hideAccountNumbers`: already omitted in payload `accounts`; also strip account numbers from any description fields if present
- `hiddenMerchantPatterns`: case-insensitive substring match on income/expense line labels and annotation context — replace with `[redacted]`

Redaction stored on share row; export-from-app uses current form values without persisting unless user creates a share.

### 4. API

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/report-snapshots/{id}/shares` | local | Create share link + redaction |
| GET | `/api/report-snapshots/{id}/shares` | local | List active shares |
| DELETE | `/api/report-snapshots/{id}/shares/{shareId}` | local | Revoke |
| GET | `/api/public/broker-reports/{token}` | none | Full report bundle |
| GET/POST/DELETE | `/api/report-snapshots/{id}/annotations` | local | CRUD annotations |

Public response shape:

```json
{
  "snapshot": { "name", "asAt", "startDate", "endDate", "createdAt" },
  "payload": { ... },
  "annotations": [...],
  "redaction": { ... },
  "disclaimer": "Supporting summary only. Not financial advice."
}
```

### 5. Frontend routes

| Route | Purpose |
|-------|---------|
| `/report-snapshots/:id/report` | Authenticated print-ready report + Share / Annotate panel |
| `/r/:token` | Public read-only report (minimal chrome, no sidebar) |

**Share flow:** user configures redaction → Create link → copy URL (`/r/{token}`).

**PDF flow:** "Print / Save PDF" triggers `window.print()`; `@media print` hides nav, forces light background, page breaks between sections.

### 6. Report sections (order)

1. Header: title, as-at, period, generated date
2. Coverage warning (if `payload.coverage.sufficient === false`)
3. Net worth summary + chart
4. Income summary
5. Lender expenses
6. Serviceability / surplus
7. Assets register
8. Liabilities register
9. Annotations table (if any)
10. Footer: disclaimer, data sources (account display names from payload), snapshot id

Conduct: omitted with note "Coming soon" only if we add a stub — prefer omitting section entirely for v1.

## Risks / Trade-offs

- **[Token secrecy]** No auth — leaked token exposes report → document in UI; revoke supported
- **[Annotation without txn in period]** transaction_id must exist; validate on create
- **[Print chart quality]** SVG from Recharts usually prints OK; fallback table if chart empty
