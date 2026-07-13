# Funds Manager

Self-hosted personal finance app. Import bank statements, categorise transactions, track net worth, and understand cash flow — all on your own hardware.

> **Personal use.** No login or authentication — your data stays on your Postgres database. Not financial advice. Do not expose to the internet without your own security measures.

## What it does

Upload PDF bank statements, assign categories, and build a picture of spending, income, assets, and liabilities over time. Designed for one household running locally or on a home server — not multi-tenant SaaS.

## Features

### Overview

- **Dashboard** — balance, spending, income, and net for a chosen period; monthly profit/loss chart
- **Breakdown** — drill into categories and time ranges
- **Future predictions** — model scenarios against your categories and goals

### Cash flow

- **Transactions** — search, filter, sort, bulk categorise; transfer detection between accounts
- **Income** — income streams and verification
- **Living expenses** — lender-style expense buckets for serviceability prep
- **Serviceability** — stressed repayment and surplus estimates
- **Report snapshots** — frozen point-in-time figures for broker or adviser meetings; shareable prep sheets
- **Repeat payments** — recurring transaction detection
- **Planned spending** — budget items with transaction matching

### Net worth

- **Accounts** — multiple bank accounts with per-account filters across the app
- **Assets** — property, vehicles, super, and other balances with valuation history
- **Liabilities** — loans and debts with balance tracking

### Data & setup

- **Statements** — PDF import with parsers for BankSA, People's Choice, and a generic fallback layout; duplicate-period warnings
- **Categories** — hierarchy, colours, rules, and learned suggestions from your edits
- **Settings** — choose PostgreSQL storage, test and switch databases without restart, run schema migrations from the UI

## Get started

| I want to… | Go to |
|------------|--------|
| Run with Docker | [Wiki → Installation](https://github.com/kgz/Funds-Manager/wiki/Installation) |
| Develop locally | [Wiki → Development](https://github.com/kgz/Funds-Manager/wiki/Development) |
| Build from source or cut a release | [docs/building.md](docs/building.md) · [docs/releasing.md](docs/releasing.md) |

Published Docker image: `ghcr.io/kgz/funds-manager` (tagged per release).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Larger changes use [OpenSpec](docs/openspec.md) under `openspec/`.

## License

[MIT](LICENSE). Third-party notices (PDFium, etc.) in [`app/LICENSE`](app/LICENSE).
