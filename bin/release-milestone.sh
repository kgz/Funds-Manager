#!/usr/bin/env bash
# Manage GitHub milestones for release planning (Project #5 shows the Milestone field).
#
# Usage:
#   ./bin/release-milestone.sh create 0.2.0
#   ./bin/release-milestone.sh assign 0.2.0 93 94 95
#   ./bin/release-milestone.sh list
set -euo pipefail

REPO="${GITHUB_REPO:-kgz/Funds-Manager}"

milestone_title() {
	local version="$1"
	if [[ "$version" == v* ]]; then
		echo "$version"
	else
		echo "v${version}"
	fi
}

cmd_create() {
	local version="$1"
	local title
	title="$(milestone_title "$version")"

	if gh api "repos/${REPO}/milestones" --jq ".[] | select(.title==\"${title}\") | .number" | grep -q .; then
		echo "Milestone ${title} already exists" >&2
		exit 1
	fi

	gh api "repos/${REPO}/milestones" \
		-f "title=${title}" \
		-f "description=Target release ${title}" \
		--jq '"Created milestone #\(.number) \(.title)"'
}

cmd_assign() {
	local version="$1"
	shift
	local title
	title="$(milestone_title "$version")"

	local milestone_num
	milestone_num="$(gh api "repos/${REPO}/milestones" --jq ".[] | select(.title==\"${title}\") | .number" | head -1)"
	if [[ -z "$milestone_num" ]]; then
		echo "No milestone ${title}; create it first: $0 create ${version#v}" >&2
		exit 1
	fi

	for num in "$@"; do
		gh api -X PATCH "repos/${REPO}/issues/${num}" -f "milestone=${milestone_num}" >/dev/null
		echo "#${num} -> ${title}"
	done
}

cmd_list() {
	gh api "repos/${REPO}/milestones?state=all&per_page=100" \
		--jq '.[] | "\(.title)\topen=\(.open_issues)\tclosed=\(.closed_issues)\t#\(.number)"' \
		| column -t -s $'\t' || true
}

if [[ $# -lt 1 ]]; then
	echo "Usage: $0 <create|assign|list> ..." >&2
	exit 1
fi

case "$1" in
create)
	[[ $# -eq 2 ]] || {
		echo "Usage: $0 create <semver>" >&2
		exit 1
	}
	cmd_create "$2"
	;;
assign)
	[[ $# -ge 3 ]] || {
		echo "Usage: $0 assign <semver> <issue-num> [issue-num...]" >&2
		exit 1
	}
	cmd_assign "$2" "${@:3}"
	;;
list)
	cmd_list
	;;
*)
	echo "Unknown command: $1" >&2
	exit 1
	;;
esac
