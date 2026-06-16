# Releasing

Version source of truth: **`app/Cargo.toml`** (`version` field). Git tags use a `v` prefix: `v0.1.0`.

Releases are **manual** from your machine via `cargo release` (no GitHub Actions release workflow). **Builds run in Docker** for reproducible Linux binaries on any host.

## Prerequisites

- Docker (BuildKit enabled — default in recent Docker Desktop / Engine)
- [GitHub CLI](https://cli.github.com/) logged in (`gh auth login`) for `cargo release publish`
- `gh` and `tar` on the host

For cross-arch builds from Apple Silicon or x86_64 hosts, enable QEMU binfmt (Docker Desktop includes this):

```bash
docker run --privileged --rm tonistiigi/binfmt --install all
```

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

`cargo release publish` builds inside Debian Bookworm (same base as the runtime image), packages `dist/funds-manager-X.Y.Z-linux-<arch>.tar.gz`, and creates a GitHub Release (or uploads if the tag already exists).

### Commands

| Command | Purpose |
|---------|---------|
| `cargo release bundle` | Docker build + tarball (default `linux/amd64`) |
| `cargo release publish` | Bundle + `gh release create` / `upload` |
| `cargo release bundle --platform linux/arm64` | ARM64 tarball |
| `cargo release publish --draft` | Draft release |
| `cargo release bundle --local` | Host build (needs Rust + pnpm locally) |

### Supported Linux targets

| `--platform` | Asset suffix | Notes |
|--------------|--------------|-------|
| `linux/amd64` (default) | `linux-x86_64` | Intel/AMD 64-bit |
| `linux/arm64` | `linux-aarch64` | ARM64 (Raspberry Pi 4+, AWS Graviton, etc.) |

Both targets use **glibc on Debian Bookworm**. They run on modern distros (Ubuntu 22.04+, Debian 12+, Fedora 38+, etc.) with a compatible glibc — same environment as the published Docker image.

To ship both architectures, run `cargo release publish` twice with different `--platform` values (uploads a second asset to the same release).

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

1. Download `funds-manager-X.Y.Z-linux-x86_64.tar.gz` (or `linux-aarch64`) from the release
2. Extract, set `DATABASE_URL`, run `./server_v2`
3. Migrations run automatically on startup

### Local dev (from source)

See [building.md](building.md).

## Related

- [#70](https://github.com/kgz/Funds-Manager/issues/70) — versioning (`/api/version`, bump script)
- [#66](https://github.com/kgz/Funds-Manager/issues/66) — Docker image
