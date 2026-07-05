# Security

## Reporting vulnerabilities

If you find a security issue, please **do not** open a public GitHub issue.

Email the maintainer via GitHub (profile contact) or open a **private security advisory** on this repository once it is public.

We will acknowledge reports within a few days and work on a fix before public disclosure when appropriate.

## Threat model

Funds Manager is **self-hosted personal finance software**:

- **No authentication** — anyone who can reach the server can use the app. Run on localhost or a trusted network only.
- **Sensitive data** — bank statements, transactions, and categories live in **your** PostgreSQL database. The app does not send financial data to third-party services.
- **PDF import** — statement files are processed locally; do not commit real statements or `.env` files to git.

## Your responsibilities

- Keep `DATABASE_URL` and TLS key paths in `.env` files (gitignored), not in the repo.
- Do not expose the default install to the internet without reverse proxy auth, VPN, or equivalent.
- Back up your database; use `backups/` locally (gitignored) for dumps.

## Git history

Local mkcert dev certificates were removed from the tree in June 2026 and **purged from git history** in July 2026. Regenerate dev certs with `./bin/dev-setup.sh` after cloning.
