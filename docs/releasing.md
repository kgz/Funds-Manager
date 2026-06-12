# Releasing

Version source of truth: **`app/Cargo.toml`** (`version` field). Git tags use a `v` prefix: `v0.1.0`.

## Semver

| Bump | When |
|------|------|
| **Patch** | Bug fixes, docs, dependency updates |
| **Minor** | New features, backward-compatible API changes |
| **Major** | Breaking API or migration changes |

## Cut a release

1. Ensure `main` is green and changelog-worthy PRs are merged
2. Bump versions:

```bash
./bin/bump-version.sh 0.2.0
```

3. Commit and tag:

```bash
git commit -am "Bump version to 0.2.0"
git tag v0.2.0
git push origin main --tags
```

4. Push tag triggers `.github/workflows/docker-publish.yml` → `ghcr.io/kgz/funds-manager:X.Y.Z` and `:latest`
5. GitHub Release — see [#69](https://github.com/kgz/Funds-Manager/issues/69)

Tag `vX.Y.Z` must match `app/Cargo.toml` version (CI check planned in [#67](https://github.com/kgz/Funds-Manager/issues/67)).

## Verify running version

```bash
curl -s http://127.0.0.1:2020/api/version | jq
```

```json
{ "version": "0.1.0", "gitSha": "abc1234" }
```

`gitSha` is embedded at compile time when built inside a git checkout.

## Upgrade (self-hosted)

1. Pull new image or replace release binary
2. Restart the server — embedded Diesel migrations run on startup
3. Confirm `/api/version` matches the expected release
