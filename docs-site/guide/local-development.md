# Run from a git clone

Use this when you want the full source tree: local development, contributing, or running against a demo database.

## What you need

| Tool | Why |
|------|-----|
| [Git](https://git-scm.com/) | Clone the repo |
| [Rust](https://rustup.rs/) (stable) | API server |
| [pnpm](https://pnpm.io/) 9+ | Frontend |
| [Docker](https://docs.docker.com/) 24+ | PostgreSQL |
| [mkcert](https://github.com/FiloSottile/mkcert) | Local HTTPS certs for the debug server |

## 1. Clone

```bash
git clone https://github.com/kgz/Funds-Manager.git
cd Funds-Manager
```

## 2. One-time setup

From the repo root:

```bash
./bin/dev-setup.sh
```

That starts Postgres (port **5434**), creates local TLS certs, copies example env files if needed, and installs frontend packages.

## 3. Start the app

Two terminals:

```bash
# Terminal 1 - API
cd app && cargo run
```

```bash
# Terminal 2 - UI
cd frontend && pnpm dev
```

Open **http://localhost:3000** in your browser.

::: tip
On WSL + Windows Chrome, stick with **http** (not https) on port 3000 unless you've installed the mkcert root certificate in Windows.
:::

## Optional: demo data

Isolated database with sample transactions, accounts, plans, and more (never touches your real `funds` DB):

```bash
./bin/setup-demo-db.sh
cp app/.env.demo app/.env
cd app && cargo run
```

Then start the UI as above. Reset anytime with `./bin/setup-demo-db.sh --reset`.

## First steps in the UI

1. **Statements** - upload a PDF, or explore the demo data.
2. **Transactions** - categorise and find transfers.
3. **Planning** - add upcoming spends or loan events.

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| Nothing loads / API errors | Confirm both terminals are running; API defaults to port 2020 |
| Port already in use | Change `SERVER_PORT` in `app/.env` and the Vite API proxy target in `frontend/.env` |
| Empty dashboard | Upload a statement, or switch to the demo database |
| Certificate warnings | Use `http://localhost:3000` with `VITE_DEV_HTTP=true` |

## Prefer not to compile?

See [Run with Docker](./docker) - pull the published image instead.
