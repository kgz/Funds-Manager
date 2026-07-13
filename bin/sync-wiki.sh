#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
wiki_dir="${TMPDIR:-/tmp}/funds-manager-wiki-$$"
repo="https://github.com/kgz/Funds-Manager.wiki.git"
new_page_url="https://github.com/kgz/Funds-Manager/wiki/_new"

cleanup() {
	rm -rf "$wiki_dir"
}
trap cleanup EXIT

if ! gh api repos/kgz/Funds-Manager --jq '.has_wiki' | grep -q true; then
	echo "Wiki is not enabled on kgz/Funds-Manager."
	echo "Enable it in repo Settings → General → Features → Wikis, then re-run."
	exit 1
fi

wiki_exists() {
	git ls-remote "$repo" HEAD &>/dev/null
}

clone_wiki() {
	git clone "$repo" "$wiki_dir"
}

bootstrap_wiki() {
	mkdir -p "$wiki_dir"
	cd "$wiki_dir"
	git init -q
	git remote add origin "$repo"
	cp "$root"/docs/wiki/*.md .
	git add -A
	git commit -q -m "Initial wiki from docs/wiki"
	git branch -M master
	git push -u origin master 2>/dev/null || git push -u origin main
}

if wiki_exists; then
	clone_wiki
else
	echo "Wiki git repo not created yet — bootstrapping from docs/wiki…"
	if ! bootstrap_wiki; then
		echo ""
		echo "Could not push to the wiki repo. Create the first page in the browser, then re-run:"
		echo "  ${new_page_url}"
		echo ""
		echo "Title: Home — paste docs/wiki/Home.md, save, then:"
		echo "  ./bin/sync-wiki.sh"
		exit 1
	fi
	echo "Wiki bootstrapped."
	exit 0
fi

cp "$root"/docs/wiki/*.md "$wiki_dir"/
cd "$wiki_dir"

if git status --porcelain | grep -q .; then
	git add -A
	git commit -m "Sync wiki from docs/wiki"
	branch="$(git branch --show-current)"
	git push origin "$branch" 2>/dev/null \
		|| git push origin HEAD:master 2>/dev/null \
		|| git push origin HEAD:main
	echo "Wiki updated."
else
	echo "Wiki already up to date."
fi
