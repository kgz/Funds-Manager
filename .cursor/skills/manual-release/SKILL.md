---
name: manual-release
description: Build, bundle, and publish a Funds Manager GitHub Release from a local machine using `cargo release` (funds-release). Use when the user mentions manual releases, GitHub Releases, tags like `vX.Y.Z`, bundling `server_v2`, Docker release builds, or publishing release assets.
disable-model-invocation: true
---

# Manual release (cargo + Docker)

Use this repo’s manual release flow (no GitHub Actions release workflow). **Default builds run in Docker** for reproducible Linux binaries.

## Preconditions

- Docker installed and running
- `gh` installed and authenticated (`gh auth login`)
- `cargo release` alias in `.cargo/config.toml` (runs `funds-release`)

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

4. Publish the GitHub Release asset:

```bash
cargo release publish
```

Builds run in Docker (Debian Bookworm, same as production image). Default platform: `linux/amd64`.

### Useful variants

- Build tarball only:

```bash
cargo release bundle
```

- ARM64 asset:

```bash
cargo release publish --platform linux/arm64
```

- Draft release:

```bash
cargo release publish --draft
```

- Host build (no Docker — needs Rust + pnpm):

```bash
cargo release bundle --local
```

## Output

- Tarball in `dist/`: `funds-manager-X.Y.Z-linux-x86_64.tar.gz` (or `linux-aarch64`)
- GitHub Release tag: `vX.Y.Z`

## Notes

- Docker publish on tag push is separate (`docker-publish.yml`).
- Cross-arch from Mac/ARM: ensure binfmt is installed (`docker run --privileged --rm tonistiigi/binfmt --install all`).
- If `cargo release` alias is missing:

```bash
cargo run --release -p funds-release -- publish
```
