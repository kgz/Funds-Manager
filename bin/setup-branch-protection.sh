#!/usr/bin/env bash
# Apply recommended branch protection on main (run after the repo is public).
#
# Private repos on GitHub Free need Pro for branch protection. Public repos get it free.
#
# Usage:
#   ./bin/setup-branch-protection.sh           # apply defaults
#   ./bin/setup-branch-protection.sh --dry-run # print payload only
set -euo pipefail

REPO="${GITHUB_REPO:-kgz/Funds-Manager}"
BRANCH="${BRANCH:-main}"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
	case "$1" in
	--dry-run)
		DRY_RUN=true
		shift
		;;
	*)
		echo "Unknown option: $1" >&2
		echo "Usage: $0 [--dry-run]" >&2
		exit 1
		;;
	esac
done

private="$(gh api "repos/${REPO}" --jq .private)"
if [[ "$private" == "true" ]]; then
	echo "Repo is still private — branch protection needs Public (or GitHub Pro)." >&2
	echo "Make the repo public first, then re-run this script." >&2
	echo "See docs/go-public.md" >&2
	exit 1
fi

# Job name from .github/workflows/ci.yml
STATUS_CHECKS='["frontend"]'

payload="$(cat <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ${STATUS_CHECKS}
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": true
}
EOF
)"

if [[ "$DRY_RUN" == "true" ]]; then
	echo "Would PUT repos/${REPO}/branches/${BRANCH}/protection"
	echo "$payload" | python3 -m json.tool
	exit 0
fi

echo "Protecting ${BRANCH} on ${REPO}…"
gh api -X PUT "repos/${REPO}/branches/${BRANCH}/protection" --input - <<<"$payload" >/dev/null

echo "Enabling delete-branch-on-merge…"
gh api -X PATCH "repos/${REPO}" -f delete_branch_on_merge=true >/dev/null

echo "Done."
echo ""
echo "main is now protected:"
echo "  - PR required (0 approvals — fine for solo use)"
echo "  - CI status check: frontend (strict / up to date)"
echo "  - No force push or branch delete"
echo "  - Conversation resolution required"
echo "  - Admins can bypass (enforce_admins: false)"
echo ""
echo "Manual (Settings UI): Secret scanning, Dependabot alerts — see docs/go-public.md"
