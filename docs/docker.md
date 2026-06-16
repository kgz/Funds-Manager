# Docker

Run Funds Manager without installing Rust or Node locally.

> **Personal use.** No authentication — do not expose to the internet without your own protections.

## Quick start

Start your existing dev Postgres (if not already running):

```bash
docker compose -f database/docker-compose.yml up -d postgres
```

Then run the app:

```bash
docker compose up -d
```

Open **http://localhost:2020**

The app container connects to **host Postgres on port 5434** (`host.docker.internal`) — same DB as local `cargo run` dev.

### Bundled Postgres (isolated, empty DB)

```bash
docker compose --profile bundled-db up -d
```

Uses an internal `postgres` service and a `postgres_data` volume instead of your dev data.

## Pull published image

When releases are published to GHCR:

```bash
curl -O https://raw.githubusercontent.com/kgz/Funds-Manager/main/docker-compose.yml
docker compose pull
docker compose up -d
```

Image: `ghcr.io/kgz/funds-manager:latest` (also tagged `X.Y.Z` per [release](releasing.md)).

## Build image locally

```bash
./bin/docker-build.sh
docker compose up -d
```

Or `docker compose build` if you do not have local `database/postgres` data directories.

## Configuration

| Variable | Default in compose | Description |
|----------|-------------------|-------------|
| `DATABASE_URL` | `postgres://funds:funds@host.docker.internal:5434/funds` | Host dev Postgres; override in `.env` |
| `SERVER_PORT` | `2020` | Host port mapping via `${SERVER_PORT:-2020}` |
| `PDFIUM_LIBRARY_PATH` | `/app/lib/libpdfium.so` | Bundled in image |
| `RUST_LOG` | `info` | Log level |

Postgres credentials (`funds` / `funds`) are fine for local self-hosting. Change them for anything beyond localhost.

## Data persistence

**Default (host Postgres):** data lives in `database/postgres/` (or `POSTGRES_DATA_DIR`) — same as local dev.

**Bundled Postgres (`--profile bundled-db`):** data in the `postgres_data` Docker volume. Reset with:

```bash
docker compose --profile bundled-db down -v
```

## Upgrade

```bash
docker compose pull
docker compose up -d
```

Migrations run automatically when the app container starts. Check version:

```bash
curl -s http://localhost:2020/api/version
```

## App only (external database)

```bash
docker pull ghcr.io/kgz/funds-manager:latest
docker run -p 2020:2020 \
  -e DATABASE_URL=postgres://user:pass@host:5432/funds?sslmode=disable \
  ghcr.io/kgz/funds-manager:latest
```
