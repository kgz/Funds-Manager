# Releasing

Version source of truth: **`app/Cargo.toml`** (`version` field). Git tags use a `v` prefix: `v0.1.0`.

Releases are **manual** from your machine via `cargo release` (no GitHub Actions release workflow).

## Prerequisites

- Rust, pnpm, `tar`
- [GitHub CLI](https://cli.github.com/) logged in (`gh auth login`) for `cargo release publish`

## Semver

| Bump | When |
|------|------|
| **Patch** | Bug fixes, docs, dependency updates |
| **Minor** | New features, backward-compatible API changes |
| **Major** | Breaking API or migration changes |

## Cut a release

```bash
./bin/bump-version.sh 0.2.0
git commit -am "Bump version to 0.2.0"
git tag v0.2.0
git push origin main --tags

cargo release publish
```

`cargo release publish` builds the frontend embed, compiles `server_v2` in release mode, packages `dist/funds-manager-X.Y.Z-<os>-<arch>.tar.gz`, and creates a GitHub Release (or uploads if the tag already exists).

### Commands

| Command | Purpose |
|---------|---------|
| `cargo release bundle` | Build + tarball only (writes path to stdout) |
| `cargo release publish` | Bundle + `gh release create` / `upload` |
| `cargo release bundle --skip-frontend` | Reuse existing `app/static/` |
| `cargo release publish --draft` | Draft release |

Docker image publish still runs on tag push via `docker-publish.yml` → `ghcr.io/kgz/funds-manager`.

Make the GHCR package **public** after first publish (Settings → Package visibility) if the repo is public.

## Verify

```bash
curl -s http://127.0.0.1:2020/api/version | jq
```

```json
{ "version": "0.1.0", "gitSha": "abc1234" }
```

## Upgrade paths

### Docker

```bash
docker compose pull
docker compose up -d
curl -s http://localhost:2020/api/version
```

See [docker.md](docker.md).

### Linux binary (GitHub Release asset)

1. Download `funds-manager-X.Y.Z-linux-x86_64.tar.gz` from the release
2. Extract, set `DATABASE_URL`, run `./server_v2`
3. Migrations run automatically on startup

### Local dev (from source)

See [building.md](building.md).

## Related

- [#70](https://github.com/kgz/Funds-Manager/issues/70) — versioning (`/api/version`, bump script)
- [#66](https://github.com/kgz/Funds-Manager/issues/66) — Docker image
