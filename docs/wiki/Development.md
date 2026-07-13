# Development

Local development setup for contributors.

> **Personal use.** No authentication — do not expose to the internet without your own protections.

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Rust](https://rustup.rs/) | stable | Backend |
| [pnpm](https://pnpm.io/) | 9+ | Frontend |
| [Docker](https://docs.docker.com/) | 24+ | PostgreSQL |
| [mkcert](https://github.com/FiloSottile/mkcert) | latest | Local HTTPS certs for debug backend |

Optional: `cargo watch` for backend auto-reload (`cargo install cargo-watch`).

## Quick start

From the repo root:

```bash
git clone https://github.com/kgz/Funds-Manager.git
cd Funds-Manager
./bin/dev-setup.sh
```

Then in two terminals:

```bash
# Terminal 1
cd app && cargo run

# Terminal 2
cd frontend && pnpm dev
```

Open **http://localhost:3000** (not https — see WSL / Windows below).

## What dev-setup does

1. Starts PostgreSQL via `database/docker-compose.yml` (port **5434**)
2. Creates `certs/localhost.pem` + `certs/localhost-key.pem` via mkcert (gitignored)
3. Copies `.env.skeleton` / `.env.example` → `.env` if missing
4. Runs `pnpm install` in `frontend/`

## Environment files

| File | Purpose |
|------|---------|
| `app/.env` | `DATABASE_URL`, `CERT_PATH`, `KEY_PATH`, `SERVER_PORT`, `VITE_DEV_SERVER_ORIGIN` |
| `database/.env` | `DATABASE_URL` for CLI tools (`migrate`, etc.) |
| `frontend/.env` | `VITE_PORT`, `VITE_DEV_HTTP`, optional `VITE_API_PROXY_TARGET` |

Defaults match docker-compose Postgres: `postgres://funds:funds@127.0.0.1:5434/funds`

## Architecture (dev)

- **Debug backend** (`cargo run` in `app/`): HTTPS on port **2020**, serves HTML shell that loads Vite HMR
- **Vite** on port **3000**: proxies `/api` → `https://127.0.0.1:2020`
- **Migrations**: applied automatically on backend startup

## WSL + Windows

If Chrome on Windows shows `ERR_CERT_AUTHORITY_INVALID` for `https://localhost:3000`:

1. Keep `VITE_DEV_HTTP=true` in `frontend/.env` (default from `.env.example`)
2. Use **http://localhost:3000**
3. Set `VITE_DEV_SERVER_ORIGIN=http://localhost:3000` in `app/.env`

To use HTTPS everywhere, run `mkcert -install` in **Windows** (where your browser runs), not only in WSL.

## Manual database

```bash
docker compose -f database/docker-compose.yml up -d postgres
```

Run migrations manually (optional — backend does this on start):

```bash
cd database && cargo run --bin migrate
```

## Benchmark database

Isolated DB for performance testing — never touches `funds`:

```bash
./bin/setup-benchmark-db.sh
```

## Tests

```bash
cargo test --workspace
cd frontend && pnpm run build
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Port 2020 in use | Set `SERVER_PORT` in `app/.env` and `VITE_API_PROXY_TARGET` in `frontend/.env` |
| `CERT_PATH` panic | Run `./bin/dev-setup.sh` or set paths to `../certs/localhost.pem` |
| PDF parse fails | Bundled `app/lib/libpdfium.so` — set `PDFIUM_LIBRARY_PATH` if needed |
| Empty dashboard | Upload a statement PDF via **Statements** |

## See also

- [Installation](Installation) — Docker for non-developers
- [CONTRIBUTING.md](https://github.com/kgz/Funds-Manager/blob/main/CONTRIBUTING.md)
- [docs/building.md](https://github.com/kgz/Funds-Manager/blob/main/docs/building.md)
