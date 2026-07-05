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
2. Run branch protection (needs public on Free plan):

```bash
./bin/setup-branch-protection.sh
```

3. **Settings → Code security and analysis**
   - Enable **Secret scanning** (and push protection if available)
   - Enable **Dependabot alerts** and **Dependabot security updates**
4. Tag **good first issue** on suitable backlog items (e.g. #63, #59)

Dependabot version updates are configured in `.github/dependabot.yml` (#67).

### Branch protection (`main`)

Applied by `./bin/setup-branch-protection.sh` after the repo is public:

| Rule | Setting | Why |
|------|---------|-----|
| Pull request required | Yes, 0 approvals | Keeps direct pushes off `main`; you can still self-merge your PRs |
| Status checks | `frontend` (strict) | Matches `.github/workflows/ci.yml`; branch must be up to date |
| Force push | Blocked | Stops rewritten history on `main` |
| Branch delete | Blocked | Stops accidental `main` removal |
| Conversation resolution | Required | PR threads resolved before merge |
| Admin bypass | Allowed | `enforce_admins: false` — you can break glass in an emergency |

**Not enabled (solo maintainer):** required reviewer count, code owner reviews, signed commits, linear history.

If you add a Rust job to CI later, extend `STATUS_CHECKS` in `bin/setup-branch-protection.sh`.

**Optional repo settings** (Settings → General → Pull Requests):

- **Automatically delete head branches** — also enabled by the script (`delete_branch_on_merge`)
- Prefer **Merge commits** (matches current workflow) or switch to squash-only if you want a linear history without enabling the strict linear-history rule

### Forks and contributions (public)

- **Settings → General → Pull Requests** — allow edits from maintainers on fork PRs (default)
- `CODEOWNERS` is set for `/app`, `/database`, `/crates/statement-parser/` — only matters if you turn on required code owner review
- Dependabot opens PRs; with protection on, they must pass `frontend` CI before merge

## After public

- Confirm CI passes on `main`
- Optional: tag `v0.1.0` to exercise release + Docker publish workflows
