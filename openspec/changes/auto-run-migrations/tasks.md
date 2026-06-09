## 1. Database crate

- [x] 1.1 `run_pending_migrations` returns `Result` instead of panicking
- [x] 1.2 `migrate_on_startup()` logs pending count and applies migrations

## 2. Server startup

- [x] 2.1 Call `migrate_on_startup()` before `HttpServer` bind
- [x] 2.2 Exit non-zero with clear log on migration failure

## 3. Manual migrate binary

- [x] 3.1 `database/src/bin/migrate.rs` uses shared helper; exit 1 on failure

## 4. Specs / docs

- [x] 4.1 Update `openspec/specs/api/spec.md` — Postgres + startup behaviour
- [x] 4.2 Note in `database/MIGRATION.md` that manual migrate is optional
