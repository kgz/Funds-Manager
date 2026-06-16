---
name: manual-release
description: Build, bundle, and publish a Funds Manager GitHub Release from a local machine using `cargo release` (funds-release). Use when the user mentions manual releases, GitHub Releases, tags like `vX.Y.Z`, bundling `server_v2`, or publishing release assets.
disable-model-invocation: true
---

# Manual release (cargo)

Use this repo’s manual release flow (no GitHub Actions release workflow).

## Preconditions

- `gh` installed and authenticated (`gh auth login`)
- `pnpm` installed
- `cargo release` alias exists in `.cargo/config.toml` (runs `funds-release`)

## Release workflow

1. Ensure `main` is up to date:

```bash
git checkout main && git pull origin main
```

2. Bump version (source of truth is `app/Cargo.toml`):

```bash
./bin/bump-version.sh X.Y.Z
git commit -am "Bump version to X.Y.Z"
```

3. Tag + push:

```bash
git tag vX.Y.Z
git push origin main --tags
```

4. Publish the GitHub Release asset from your machine:

```bash
cargo release publish
```

### Useful variants

- Build tarball only:

```bash
cargo release bundle
```

- Draft release:

```bash
cargo release publish --draft
```

- Reuse existing `app/static/`:

```bash
cargo release publish --skip-frontend
```

## Output

- Tarball in `dist/`: `funds-manager-X.Y.Z-<os>-<arch>.tar.gz`
- GitHub Release tag: `vX.Y.Z`

## Notes

- Docker publish is separate and still runs on tag push via `docker-publish.yml`.
- If `cargo release` alias is missing, use:

```bash
cargo run --release -p funds-release -- publish
```

