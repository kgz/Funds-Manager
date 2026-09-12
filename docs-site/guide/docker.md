# Run with Docker

Use this when you want Funds Manager running without installing Rust or Node. You only need Docker.

Image: `ghcr.io/kgz/funds-manager:latest` (also tagged per release).

Open **http://localhost:2020** when the app container is up.

::: warning
There is **no authentication**. Do not publish port 2020 to the public internet without your own protections.
:::

## Two ways to run Postgres

| Setup | Postgres | Best when |
|-------|----------|-----------|
| **Bundled** | Postgres container next to the app | You want one command and an empty DB |
| **Host / separate** | Postgres on port **5434** (or your own server) | You already develop locally, or share one DB |

Both use the same app image. The difference is only `DATABASE_URL` and whether the `postgres` service is started.

---

## 1. App + bundled Postgres

One compose file. The `postgres` service is under profile `bundled-db`.

Save as `docker-compose.yml` (or curl it from the repo):

```bash
curl -O https://raw.githubusercontent.com/kgz/Funds-Manager/main/docker-compose.yml
```

```yaml
# Pull-and-run: Funds Manager app (+ optional bundled Postgres)
#
# Bundled Postgres:
#   DATABASE_URL=postgres://funds:funds@postgres:5432/funds?sslmode=disable \
#     docker compose --profile bundled-db up -d
#
# Host Postgres on port 5434 instead:
#   docker compose up -d
services:
  postgres:
    profiles: ["bundled-db"]
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: funds
      POSTGRES_PASSWORD: funds
      POSTGRES_DB: funds
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U funds -d funds"]
      interval: 5s
      timeout: 5s
      retries: 10

  app:
    image: ghcr.io/kgz/funds-manager:latest
    build: .
    restart: unless-stopped
    extra_hosts:
      - "host.docker.internal:host-gateway"
    ports:
      - "${SERVER_PORT:-2020}:2020"
    environment:
      DATABASE_URL: ${DATABASE_URL:-postgres://funds:funds@host.docker.internal:5434/funds?sslmode=disable}
      SERVER_PORT: "2020"
      PDFIUM_LIBRARY_PATH: /app/lib/libpdfium.so
      RUST_LOG: info

volumes:
  postgres_data:
```

Start **app + bundled Postgres**:

```bash
DATABASE_URL=postgres://funds:funds@postgres:5432/funds?sslmode=disable \
  docker compose --profile bundled-db up -d
```

Stop and wipe that database:

```bash
docker compose --profile bundled-db down -v
```

---

## 2. Postgres on the host (port 5434)

Use a **separate** compose file for Postgres only - same layout local development uses. Data lives in a folder on disk (default `./postgres` next to this file).

Save as `postgres-compose.yml` (or use `database/docker-compose.yml` from a clone):

```yaml
# Postgres for Funds Manager (host port 5434)
services:
  postgres:
    restart: unless-stopped
    image: postgres:16
    environment:
      POSTGRES_USER: funds
      POSTGRES_PASSWORD: funds
      POSTGRES_DB: funds
    ports:
      - "5434:5432"
    volumes:
      - ${POSTGRES_DATA_DIR:-./postgres}:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U funds -d funds"]
      interval: 5s
      timeout: 5s
      retries: 5
```

Start Postgres:

```bash
docker compose -f postgres-compose.yml up -d
```

Then start **only the app** with the root `docker-compose.yml` from [section 1](#1-app--bundled-postgres). Default `DATABASE_URL` already points at `host.docker.internal:5434`:

```bash
docker compose up -d
```

From a full git clone:

```bash
docker compose -f database/docker-compose.yml up -d postgres
docker compose up -d
```

---

## App container only

If Postgres is already somewhere else:

```bash
docker pull ghcr.io/kgz/funds-manager:latest
docker run -p 2020:2020 \
  -e DATABASE_URL=postgres://USER:PASS@HOST:5432/funds?sslmode=disable \
  ghcr.io/kgz/funds-manager:latest
```

---

## Upgrade

```bash
docker compose pull
docker compose up -d
```

Schema migrations run when the app starts.

```bash
curl -s http://localhost:2020/api/version
```

## First use

1. Open **http://localhost:2020**.
2. Go to **Statements** and upload a bank PDF.
3. Review **Transactions** and set categories.

Storage settings live under **Settings** in the app.

## Prefer developing from source?

See [Run from a git clone](./local-development).
