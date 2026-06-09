# Auto-run database migrations on startup (#51)

Operators should not need a manual migrate step after deploying a release. The server applies pending embedded Diesel migrations before binding HTTP.

## Related

- #51 Ops: auto-run database migrations on server startup
- `database/src/bin/migrate.rs` — kept as optional manual/CI tool
