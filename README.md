# Funds Manager

Self-hosted personal finance app: import bank statement PDFs, categorise transactions, and view spending, income, and balance trends on a dashboard.

> **Personal use.** No login or authentication — your data stays on your Postgres instance. Not financial advice. Do not expose to the internet without your own security measures.

## Features

- PDF statement import (BankSA, People's Choice, and more)
- Multi-account tracking and filtering
- Dashboard KPIs, category breakdowns, balance charts
- Transactions, categories, recurring payment detection
- Auto-migrations on server startup

## Quick start (local dev)

**Prerequisites:** Rust, pnpm, Docker, [mkcert](https://github.com/FiloSottile/mkcert)

```bash
git clone https://github.com/kgz/Funds-Manager.git
cd Funds-Manager
./bin/dev-setup.sh

# Terminal 1
cd app && cargo run

# Terminal 2
cd frontend && pnpm dev
```

Open **http://localhost:3000**

Full guide: [docs/local-development.md](docs/local-development.md)

## Docker

```bash
docker compose up -d
```

Open **http://localhost:2020**. See [docs/docker.md](docs/docker.md).

Published image: `ghcr.io/kgz/funds-manager` (on release tags).

## Build from source

See [docs/building.md](docs/building.md). Versioning and releases: [docs/releasing.md](docs/releasing.md).

## Contributing

Contributing guide coming in [#67](https://github.com/kgz/Funds-Manager/issues/67). Features are spec'd with [OpenSpec](openspec/changes/README.md) under `openspec/`.

## License

License to be added ([#68](https://github.com/kgz/Funds-Manager/issues/68)). Third-party notices in `app/LICENSE` (PDFium, etc.).
