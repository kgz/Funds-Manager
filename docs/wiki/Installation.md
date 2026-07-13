# Installation

Run Funds Manager without installing Rust or Node locally.

> **Personal use.** No authentication — do not expose to the internet without your own protections.

## Quick start (Docker)

### Option A — your own Postgres

If you already run Postgres (e.g. from local dev on port **5434**):

```bash
docker compose -f database/docker-compose.yml up -d postgres   # if needed
docker compose up -d
```

Open **http://localhost:2020**

The app container connects to host Postgres on port 5434 (`host.docker.internal`).

### Option B — bundled Postgres (isolated, empty DB)

```bash
docker compose --profile bundled-db up -d
```

Uses an internal `postgres` service and a `postgres_data` volume — separate from any existing dev data.

## Pull published image

When releases are published to GHCR:

```bash
curl -O https://raw.githubusercontent.com/kgz/Funds-Manager/main/docker-compose.yml
docker compose pull
docker compose up -d
```

Image: `ghcr.io/kgz/funds-manager:latest` (also tagged `X.Y.Z` per release).

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://funds:funds@host.docker.internal:5434/funds` | Postgres connection string |
| `SERVER_PORT` | `2020` | Host port mapping |
| `RUST_LOG` | `info` | Log level |

Postgres credentials (`funds` / `funds`) are fine for local self-hosting. Change them for anything beyond localhost.

## Data persistence

**Host Postgres:** data lives in `database/postgres/` (or `POSTGRES_DATA_DIR`) — same as local dev.

**Bundled Postgres:** data in the `postgres_data` Docker volume. Reset with:

```bash
docker compose --profile bundled-db down -v
```

## Upgrade

```bash
docker compose pull
docker compose up -d
```

Migrations run automatically when the app container starts.

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

## First use

1. Open the app in your browser.
2. Go to **Statements** and upload a PDF bank statement.
3. Review transactions and assign categories.

Storage and database settings: **Settings** in the app.

## See also

- [Development](Development) — build and run from source
- [docs/docker.md](https://github.com/kgz/Funds-Manager/blob/main/docs/docker.md) — full Docker reference in the repo
