## Context

`Statement::missing_periods()` flags gaps from first upload to today. Report analysis uses an arbitrary period (same as serviceability / snapshots). Reuse statement period overlap logic scoped to that window.

## Goals / Non-Goals

**Goals:**

- Per-account month grid for `[start_date, end_date]`
- Overall `sufficient: false` when any in-scope account has a gap
- Embed coverage in snapshot payload (version 2)
- Warn on snapshot save when insufficient

**Non-Goals:**

- PDF export gate (#117)
- Income / category completeness (#14)
- Dashboard warnings (#14)

## Decisions

### 1. Coverage rule

A calendar month is covered if any active statement's `period_start`/`period_end` (fallback: `date`) overlaps that month — same as existing gap detection.

### 2. Accounts in scope

- `account_id` set → that financial account only
- unset → all active financial accounts plus legacy unlinked statement accounts

Accounts with no statements in the window: all months missing.

### 3. API

`GET /api/report-coverage/summary?start_date=&end_date=&account_id=`

### 4. Insufficient (v1)

Any missing month for any in-scope account → `sufficient: false`.

### 5. Snapshot payload

Bump to `version: 2`; add `coverage` block alongside existing fields.
