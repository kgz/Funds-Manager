#!/usr/bin/env bash
# Bump workspace crate versions (source of truth: app/Cargo.toml).
# Usage: ./bin/bump-version.sh 0.2.0
set -euo pipefail

if [[ $# -ne 1 ]]; then
	echo "Usage: $0 <semver>" >&2
	echo "Example: $0 0.2.0" >&2
	exit 1
fi

VERSION="$1"

if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
	echo "Invalid semver: $VERSION" >&2
	exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

set_package_version() {
	local file="$1"
	if [[ ! -f "$file" ]]; then
		echo "Missing $file" >&2
		exit 1
	fi
	sed -i "s/^version = \".*\"/version = \"${VERSION}\"/" "$file"
	echo "  $file"
}

echo "Bumping workspace packages to ${VERSION}"
set_package_version "${ROOT}/app/Cargo.toml"
set_package_version "${ROOT}/database/Cargo.toml"
set_package_version "${ROOT}/crates/statement-parser/Cargo.toml"
set_package_version "${ROOT}/crates/statement-parser-cli/Cargo.toml"

# Path dependency pins in app/Cargo.toml
sed -i "s/database = { version = \"[^\"]*\"/database = { version = \"${VERSION}\"/" "${ROOT}/app/Cargo.toml"
sed -i "s/statement-parser = { version = \"[^\"]*\"/statement-parser = { version = \"${VERSION}\"/" "${ROOT}/app/Cargo.toml"
sed -i "s/statement-parser = { version = \"[^\"]*\"/statement-parser = { version = \"${VERSION}\"/" "${ROOT}/crates/statement-parser-cli/Cargo.toml"

cat <<EOF

Done. Next:
  git diff
  git commit -am "Bump version to ${VERSION}"
  git tag v${VERSION}
  git push origin main --tags
EOF
