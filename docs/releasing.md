# Releasing

Version source of truth: **`app/Cargo.toml`** (`version` field). Git tags use a `v` prefix: `v0.1.0`.

## Semver

| Bump | When |
|------|------|
| **Patch** | Bug fixes, docs, dependency updates |
| **Minor** | New features, backward-compatible API changes |
| **Major** | Breaking API or migration changes |

## Pre-release checklist

- [ ] `main` has the changes you want shipped
- [ ] `./bin/bump-version.sh X.Y.Z` — tag must match Cargo version (CI enforces this)
- [ ] Commit the version bump
- [ ] Optional: smoke test locally (`./bin/dev-setup.sh` or `./bin/docker-build.sh && docker compose up -d`)

## Cut a release

```bash
./bin/bump-version.sh 0.2.0
git commit -am "Bump version to 0.2.0"
git tag v0.2.0
git push origin main --tags
```

Pushing the tag triggers:

| Workflow | Output |
|----------|--------|
| `release.yml` | GitHub Release + auto-generated notes + Linux x86_64 tarball |
| `docker-publish.yml` | `ghcr.io/kgz/funds-manager:0.2.0` and `:latest` |

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
