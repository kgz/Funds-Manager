# Building from source

## Workspace layout

```
app/                    # Actix API server (main binary)
database/               # Diesel models, migrations, CLI bins
crates/statement-parser # PDF parsing
frontend/               # React + Vite UI
```

## Development build

```bash
cd app && cargo run
```

Requires PostgreSQL running and `app/.env` configured — see [local-development.md](local-development.md).

## Release build (single binary + embedded UI)

```bash
cd frontend && pnpm install && pnpm build    # outputs to app/static/
cd ../app && cargo build --release
DATABASE_URL=postgres://... ./target/release/server_v2
```

Release mode serves the built UI from `app/static/` on plain HTTP (default port 2020).

App version is `app/Cargo.toml` → `GET /api/version`. See [releasing.md](releasing.md).

## Development reload

```bash
cd app && cargo watch -c -w . -x run
```

Requires `cargo install cargo-watch`.

## Tests

```bash
cargo test -p database
cargo test -p statement-parser
cargo test -p server_v2
```

Parser integration tests use sample PDFs and `app/lib/libpdfium.so` when present.

## PDFium

Statement PDF text extraction uses PDFium. Resolution order:

1. `PDFIUM_LIBRARY_PATH` environment variable
2. `./lib/libpdfium.so` (relative to working directory)
3. `app/lib/libpdfium.so` (bundled in repo)

## Environment variables

See `openspec/specs/deployment/spec.md` for the full list. Minimum for runtime:

| Variable | Required | Default |
|----------|----------|---------|
| `DATABASE_URL` | yes | — |
| `SERVER_PORT` | no | `2020` |
| `CERT_PATH` / `KEY_PATH` | debug only | — |
| `VITE_DEV_SERVER_ORIGIN` | debug only | `https://localhost:3000` |
| `PDFIUM_LIBRARY_PATH` | no | bundled lib |
