#!/usr/bin/env bash
# Print release notes from issues closed in a milestone.
#
# Usage:
#   ./bin/release-changelog.sh 0.2.0
#   ./bin/release-changelog.sh 0.2.0 --write /tmp/notes.md
#   cargo release publish --notes-file <(./bin/release-changelog.sh 0.2.0)
set -euo pipefail

REPO="${GITHUB_REPO:-kgz/Funds-Manager}"
WRITE_FILE=""

milestone_title() {
	local version="$1"
	if [[ "$version" == v* ]]; then
		echo "$version"
	else
		echo "v${version}"
	fi
}

while [[ $# -gt 0 ]]; do
	case "$1" in
	--write)
		WRITE_FILE="$2"
		shift 2
		;;
	-*)
		echo "Unknown option: $1" >&2
		exit 1
		;;
	*)
		break
		;;
	esac
done

[[ $# -eq 1 ]] || {
	echo "Usage: $0 <semver> [--write path.md]" >&2
	exit 1
}

TITLE="$(milestone_title "$1")"

milestone_num="$(gh api "repos/${REPO}/milestones" --jq ".[] | select(.title==\"${TITLE}\") | .number" | head -1)"
if [[ -z "$milestone_num" ]]; then
	echo "No milestone ${TITLE}" >&2
	exit 1
fi

issues_json="$(gh api "repos/${REPO}/issues?milestone=${milestone_num}&state=closed&per_page=100" \
	--jq '[.[] | select(.pull_request | not) | {number, title, labels: [.labels[].name]}]')"

count="$(echo "$issues_json" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))")"

TMP_PY="$(mktemp)"
trap 'rm -f "$TMP_PY"' EXIT
printf '%s' "$issues_json" >"$TMP_PY"

output="$(
	python3 - "$TITLE" "$TMP_PY" <<'PY'
import json
import sys

title = sys.argv[1]
with open(sys.argv[2], encoding="utf-8") as f:
    issues = json.load(f)

lines = [f"## {title}", ""]

if not issues:
    lines.append("_No closed issues in this milestone._")
    print("\n".join(lines))
    sys.exit(0)

def label_names(issue):
    return [label["name"] for label in issue.get("labels", [])]

def bucket(labels):
    names = {label.lower() for label in labels}
    if "bug" in names:
        return "fixes"
    if "enhancement" in names:
        return "features"
    return "other"

groups = {"features": [], "fixes": [], "other": []}
for issue in sorted(issues, key=lambda i: i["number"]):
    groups[bucket(label_names(issue))].append(issue)

sections = [
    ("### Features", "features"),
    ("### Fixes", "fixes"),
    ("### Other", "other"),
]

for heading, key in sections:
    items = groups[key]
    if not items:
        continue
    lines.append(heading)
    lines.append("")
    for issue in items:
        lines.append(f"- {issue['title']} ([#{issue['number']}](https://github.com/kgz/Funds-Manager/issues/{issue['number']}))")
    lines.append("")

print("\n".join(lines).rstrip())
PY
)"

if [[ -n "$WRITE_FILE" ]]; then
	printf '%s\n' "$output" >"$WRITE_FILE"
	echo "Wrote $WRITE_FILE ($count issue(s))" >&2
else
	printf '%s\n' "$output"
fi
