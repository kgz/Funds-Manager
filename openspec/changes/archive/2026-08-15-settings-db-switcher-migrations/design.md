## Context

Settings storage connect (`POST /api/settings/storage/connect`) currently mutates `AppConfig` (active connection + URL) and saves to disk **before** `swap_postgres_pool`. Swap refuses targets with pending Diesel migrations. Migrations list/run always use `get_dbo()` (live pool). After a failed switch, the UI shows the target as ACTIVE and “All applied” for the old live DB.

## Goals / Non-Goals

**Goals:**
- Atomic connect: config reflects live pool only after successful swap
- Migrations panel can inspect and apply against the selected/target connection URL
- Honest UI for failures (icons, live vs selected labels)
- Fix nested transaction wrappers in the Aug 2026 flatten migration for new databases

**Non-Goals:**
- Auto-migrate on every connect without user action
- Changing when `swap_postgres_pool` requires zero pending migrations
- SQLite local storage path

## Decisions

1. **Defer config save until swap succeeds**  
   Build the target URL in memory (including password fallback from the selected saved connection), call `swap_postgres_pool`, then update active connection + fields + `save()`. On failure, disk config and ACTIVE badge stay on the previous live profile.

2. **Target-aware migrations API**  
   `GET /api/settings/migrations` and `POST /api/settings/migrations/run` accept optional postgres fields + `connectionId` (same shape as test/connect). When omitted, behaviour stays live-pool. Frontend passes the current form + selected connection whenever loading or running migrations.

3. **Keep migrate-then-connect as two steps**  
   Show accurate pending on the selected target; user runs migrations, then Save & connect. Avoid a combined “Migrate & connect” in v1 to keep the dangerous schema apply explicit.

4. **Banner icons**  
   `SettingsBanner`: Check for `ok`, AlertTriangle (or similar) for `warn`, Info for `info`.

5. **Migration SQL**  
   Strip `BEGIN`/`COMMIT` from `2026-08-09-120000_flatten_transport_car_hierarchy` — Diesel already wraps migrations. Already-applied DBs are unaffected (version row stays).

## Risks / Trade-offs

- [Risk] Running migrations against a non-live URL while the app still serves the old pool → Mitigation: copy makes clear which database is being migrated; connect still required after.
- [Risk] Editing migration SQL after some envs applied it → Mitigation: only remove wrappers; statements unchanged; version key unchanged.
- [Risk] Password blank on form → Mitigation: reuse existing connection password fallback helpers already used by test/connect.

## Migration Plan

- Deploy with app restart; no data migration.
- Operators stuck mid-desync: after upgrade, Save & connect to the intended profile (or re-select live profile); migrations panel will match selection.
