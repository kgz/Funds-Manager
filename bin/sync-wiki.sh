#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
wiki_dir="${TMPDIR:-/tmp}/funds-manager-wiki-$$"
repo="git@github.com:kgz/Funds-Manager.wiki.git"

cleanup() {
	rm -rf "$wiki_dir"
}
trap cleanup EXIT

if ! gh api repos/kgz/Funds-Manager --jq '.has_wiki' | grep -q true; then
	echo "Wiki is not enabled on kgz/Funds-Manager."
	echo "Enable it in repo Settings → General → Features → Wikis, then re-run."
	exit 1
fi

git clone "$repo" "$wiki_dir"
cp "$root"/docs/wiki/*.md "$wiki_dir"/
cd "$wiki_dir"

if git status --porcelain | grep -q .; then
	git add -A
	git commit -m "Sync wiki from docs/wiki"
	git push origin master 2>/dev/null || git push origin main
	echo "Wiki updated."
else
	echo "Wiki already up to date."
fi
