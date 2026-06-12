# Contributing

Thanks for helping improve Funds Manager.

## Before you start

1. Open or find a [GitHub issue](https://github.com/kgz/Funds-Manager/issues) — features and larger changes should be discussed first.
2. For non-trivial work, read [docs/openspec.md](docs/openspec.md) and add a change under `openspec/changes/` before implementing.
3. Set up the app locally: [docs/local-development.md](docs/local-development.md).

## Branch and PR flow

```bash
git checkout main && git pull origin main
git checkout -b feature/<issue-num>-<short-slug>
```

Examples: `feature/63-transaction-notes`, `fix/59-monthly-pl-drilldown`.

1. Implement on your branch; keep commits focused.
2. Run checks locally (see below).
3. Push and open a PR against `main`.
4. Reference the issue in the PR body: `Closes #123`.
5. Wait for review and CI before merge.

Forks: push to your fork and open a PR from there — same branch naming and `Closes #N` convention.

## Local checks

```bash
# Rust (workspace)
cargo test --workspace

# Frontend — production embed build (same as CI / release)
cd frontend && pnpm install && pnpm run build:embed

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
