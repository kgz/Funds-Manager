## Context

Broker milestone (#107) now has income (#110), liabilities (#108), lender expenses (#112), and serviceability (#111). Each exposes report-ready JSON. #117 will assemble a PDF from these blocks; #114 freezes them at capture time so re-rendering never touches live data.

## Goals / Non-Goals

**Goals:**

- Immutable snapshot row: metadata columns + versioned JSON payload
- Capture composes existing model functions (no duplicate business logic)
- List/delete via soft delete; GET returns stored payload unchanged
- Frontend read-only detail view renders from payload (not live APIs)
- Payload `version: 1` for forward compatibility

**Non-Goals:**

- PDF export or shareable links (#117)
- Redaction or annotations (#117)
- Account conduct / coverage (#113, #116)
- Updating or patching snapshots after creation

## Decisions

### 1. Storage

Table `broker_report_snapshots`:

| column | purpose |
|--------|---------|
| `name` | user label |
| `as_at` | point-in-time date on the report |
| `start_date`, `end_date` | analysis period |
| `account_id` | optional filter (null = all accounts) |
| `rate_buffer_bps` | serviceability stress param used at capture |
| `payload` | `TEXT` JSON blob (serde round-trip) |
| `created_at`, `deleted_at` | audit + soft delete |

No UPDATE path — snapshots are write-once.

### 2. Payload shape (v1)

```json
{
  "version": 1,
  "accounts": [{ "id", "bankName", "displayName" }],
  "income": { ...IncomeSummaryResponse },
  "lenderExpenses": { ...LenderExpenseSummaryResponse },
  "serviceability": { ...ServiceabilitySummaryResponse },
  "assets": { ...AssetListResponse },
  "liabilities": { ...LiabilityListResponse },
  "netWorth": { "points": [...], "latest": { ... } }
}
```

Account numbers omitted from `accounts` (redaction-friendly for #117).

### 3. Capture

`report_snapshot::capture(...)` calls:

- `income_stream::income_summary`
- `lender_expense::expense_summary`
- `serviceability::serviceability_summary`
- `Asset::list_with_total`, `Liability::list_with_total`
- `analytics::net_worth_over_time` for chart data; `latest` = last point on or before `as_at`

Default `as_at` = today (server local date).

### 4. API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/report-snapshots` | List active (metadata only) |
| GET | `/api/report-snapshots/{id}` | Full snapshot + payload |
| POST | `/api/report-snapshots` | Capture and store |
| DELETE | `/api/report-snapshots/{id}` | Soft delete |

POST body: `name`, `asAt`, `startDate`, `endDate`, optional `accountId`, optional `rateBufferBps` (default 300), optional `minOccurrences` (default 3).

### 5. Frontend

- Route `/report-snapshots` — list + "Save snapshot" form (period, account, name)
- Route `/report-snapshots/:id` — read-only broker summary (serviceability cards + key registers)
- Nav: **Report snapshots** under Cash flow (after Serviceability)

## Risks / Trade-offs

- **[Payload size]** Full JSON can grow → acceptable for v1 single-user; compress later if needed
- **[Schema drift]** Live API shapes may change → `version` field + #117 reads stored blob only
- **[Net worth at as_at]** Interpolated from daily points; stored as captured, not recomputed on read
