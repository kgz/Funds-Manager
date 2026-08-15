## 1. Backend connect ordering

- [x] 1.1 Build target URL without saving; call `swap_postgres_pool` first
- [x] 1.2 On success only: set active connection, sync fields, save config
- [x] 1.3 On failure: leave config/pool unchanged; return existing error message

## 2. Target-aware migrations

- [x] 2.1 `list_migration_status_for_url` / `run_pending_migrations_for_url` in `database`
- [x] 2.2 Migrations GET/POST accept optional `connectionId` + postgres fields
- [x] 2.3 Frontend passes selected connection + form on status load and run

## 3. Settings UI polish

- [x] 3.1 `SettingsBanner` icons by kind (`ok` / `warn` / `info`)
- [x] 3.2 Relabel live DB row; show when selected target ≠ live
- [x] 3.3 After connect failure for pending migrations, refresh migrations for that target

## 4. Migration SQL

- [x] 4.1 Remove `BEGIN`/`COMMIT` from `2026-08-09-120000_flatten_transport_car_hierarchy` up/down if present

## 5. Verify

- [x] 5.1 `cargo test` in `database/` and `app/` as applicable
- [ ] 5.2 Manual: fail connect to pending DB → ACTIVE unchanged; run pending on target; connect succeeds
