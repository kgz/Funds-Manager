# Go public checklist

Run through this before changing repository visibility to **public**.

## Repo (this PR / main)

- [x] Root `LICENSE` (MIT) — distinct from third-party notices in `app/LICENSE`
- [x] `SECURITY.md`
- [x] `.gitignore` covers `*.pem`, `*.key`, `backups/`, `*.dump`, `.env`
- [x] No tracked certs or secrets in the current tree
- [x] `app/.env.benchmark` uses relative cert paths

## Git history audit

Historical commits (before `72cb313`) contained **mkcert localhost dev certs** in `frontend/`. They are not in the current tree. Low risk (local dev only). Optional: rewrite history with `git filter-repo` if you want a clean public history.

```bash
# Optional — only if you want to purge paths from all history (force-push required)
# pip install git-filter-repo
# git filter-repo --path frontend/localhost+2.pem --path frontend/localhost+2-key.pem --invert-paths
```

## GitHub settings (manual)

In **Settings → General → Danger zone** (or repo admin):

1. **Change visibility** → Public
2. **Settings → Code security and analysis**
   - Enable **Secret scanning** (and push protection if available)
   - Enable **Dependabot alerts** and **Dependabot security updates**
3. **Settings → Branches** → branch protection on `main`:
   - Require PR before merging
   - Require status checks: `frontend` (CI workflow)
4. Tag **good first issue** on suitable backlog items (e.g. #63, #59)

Dependabot version updates are configured in `.github/dependabot.yml` (#67).

## After public

- Confirm CI passes on `main`
- Optional: tag `v0.1.0` to exercise release + Docker publish workflows
