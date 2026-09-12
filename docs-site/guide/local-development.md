# Local development

Full steps live in the repo: [`docs/local-development.md`](https://github.com/kgz/Funds-Manager/blob/main/docs/local-development.md).

## Quick start

From the repo root:

```bash
./bin/dev-setup.sh
```

Then:

```bash
# Terminal 1 — API
cd app && cargo run

# Terminal 2 — UI
cd frontend && pnpm dev
```

UI defaults to `https://127.0.0.1:3000` (mkcert HTTPS in debug).

## Prerequisites

| Tool | Purpose |
|------|---------|
| Rust (stable) | Backend |
| pnpm 9+ | Frontend |
| Docker 24+ | PostgreSQL |
| mkcert | Local HTTPS for the debug backend |

See also [Contributing](./contributing) and [OpenSpec](https://github.com/kgz/Funds-Manager/blob/main/docs/openspec.md).
