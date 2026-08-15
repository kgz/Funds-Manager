## Why

Settings Save & connect can refuse a target database for pending migrations while Run pending is disabled (migrations UI only sees the live pool). Failed connects also mark the profile ACTIVE before the pool swaps, leaving the UI contradictory and the user stuck.

## What Changes

- Persist active profile / config URL only after a successful pool swap
- Migrations status + run can target the selected connection (not only the live pool)
- Clearer connect failure when the target needs migrations (point user at Run pending)
- Warn/error banners use a non-success icon; live-DB label clarified
- Remove nested `BEGIN`/`COMMIT` from `2026-08-09` migration SQL so Diesel’s transactional runner works on fresh DBs

## Capabilities

### New Capabilities

- `settings-db-switcher`: reliable connect + migrate flow for switching PostgreSQL profiles

### Modified Capabilities

- (none — no existing archived spec for settings storage)

## Impact

- `app/src/routes/settings_api.rs` — connect ordering; migrations endpoints accept optional target
- `database/src/modules/database.rs` — migrate/list by URL; swap unchanged gate
- `frontend/src/pages/settings.tsx`, `frontend/src/types/settings.ts` — target-aware migrations UI, banner icon, labels
- `database/migrations/2026-08-09-120000_flatten_transport_car_hierarchy/` — drop explicit transaction wrappers

Closes #283
