# Docker

Full reference: [`docs/docker.md`](https://github.com/kgz/Funds-Manager/blob/main/docs/docker.md).

Typical flow: run Postgres via Compose, point `DATABASE_URL` at it, then start the API and (optionally) the Vite frontend for development.

Production-style single-binary embeds the built frontend — see [building](https://github.com/kgz/Funds-Manager/blob/main/docs/building.md) and [releasing](https://github.com/kgz/Funds-Manager/blob/main/docs/releasing.md).
