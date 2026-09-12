# Contributing

Thanks for helping improve Funds Manager.

## Before you start

1. Open or find a [GitHub issue](https://github.com/kgz/Funds-Manager/issues) — features and larger changes should be discussed first.
2. For non-trivial work, read [docs/openspec.md](docs/openspec.md) and add a change under `openspec/changes/` before implementing.
3. Set up the app locally: [docs/local-development.md](docs/local-development.md) or the [docs site](https://kgz.github.io/Funds-Manager/guide/local-development).
4. Product docs are part of delivery: VitePress under `docs-site/` (User guide + Guide). Follow `.cursor/skills/document-feature/SKILL.md` in the **same PR** as the feature — screenshots, e2e, sidebar.

## Branch and PR flow

```bash
git checkout main && git pull origin main
git checkout -b feature/<issue-num>-<short-slug>
```

Examples: `feature/63-transaction-notes`, `fix/59-monthly-pl-drilldown`.

1. Implement on your branch; keep commits focused.
2. For UI/behaviour users can see: update User guide (effects + cross-links both ways), dead-end review, and Playwright e2e/screenshots before opening the PR.
3. Run checks locally (see below).
4. Push and open a PR against `main` (fill the PR template docs checklist).
5. Reference the issue in the PR body: `Closes #123`.
6. Wait for review and CI before merge.

Forks: push to your fork and open a PR from there — same branch naming and `Closes #N` convention.

## Local checks

```bash
# Frontend — production embed build (CI)
cd frontend && pnpm install && pnpm run build:embed

# Docs site
cd docs-site && pnpm install && pnpm build

# Rust — run locally before PR (not in CI)
cargo test --workspace

# E2E (example)
cd frontend && pnpm exec playwright test

# Stricter typecheck (optional until TS debt is cleared)
pnpm run build
```

UI changes: manually test affected routes in the browser before opening a PR.

## OpenSpec

Spec-driven changes live in `openspec/`. See [docs/openspec.md](docs/openspec.md).

## Code style

- Match existing patterns in the file you are editing.
- Rust: `cargo fmt` / `cargo clippy` where practical.
- TypeScript: no `any`; avoid type assertions (`as …`).
- Comments only for non-obvious business logic.

## Releases and versioning

Maintainers: [docs/releasing.md](docs/releasing.md).

## Questions

Open a [discussion](https://github.com/kgz/Funds-Manager/discussions) or comment on the relevant issue.
