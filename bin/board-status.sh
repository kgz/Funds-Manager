#!/usr/bin/env bash
# Update GitHub Project #5 (Funds Manager) card status for issues.
# Usage: ./bin/board-status.sh <backlog|ready|in-progress|in-review|done> <issue-num> [issue-num...]
set -euo pipefail

# gh auth token often lacks read:project; prefer GITHUB_PAT when set.
if [[ -z "${GITHUB_TOKEN:-}" && -n "${GITHUB_PAT:-}" ]]; then
  export GITHUB_TOKEN="$GITHUB_PAT"
fi

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <backlog|ready|in-progress|in-review|done> <issue-num> [issue-num...]" >&2
  exit 1
fi

STATUS_NAME="$1"
shift

case "$STATUS_NAME" in
  backlog|todo) OPT="f75ad846" ;;
  ready) OPT="61e4505c" ;;
  in-progress|in_progress) OPT="47fc9ee4" ;;
  in-review|in_review) OPT="df73e18b" ;;
  done) OPT="98236657" ;;
  *)
    echo "Unknown status: $STATUS_NAME" >&2
    exit 1
    ;;
esac

PROJECT_ID="PVT_kwHOAI9yDM4BZ4Nc"
FIELD_ID="PVTSSF_lAHOAI9yDM4BZ4NczhUz0DA"
PROJECT_NUMBER=5
REPO_OWNER="kgz"
REPO_NAME="Funds-Manager"
TMPDIR="${TMPDIR:-/tmp}/fm-board-$$"
mkdir -p "$TMPDIR"
trap 'rm -rf "$TMPDIR"' EXIT

for num in "$@"; do
  cat > "$TMPDIR/issue.graphql" <<EOF
query {
  repository(owner: "$REPO_OWNER", name: "$REPO_NAME") {
    issue(number: $num) {
      id
      projectItems(first: 10) {
        nodes {
          id
          project { number }
        }
      }
    }
  }
}
EOF
  issue_json=$(gh api graphql -F "query=@$TMPDIR/issue.graphql")
  item_id=$(echo "$issue_json" | python3 -c "
import json, sys
data = json.load(sys.stdin)
nodes = data['data']['repository']['issue']['projectItems']['nodes']
for n in nodes:
    if n.get('project', {}).get('number') == $PROJECT_NUMBER:
        print(n['id'])
        break
" 2>/dev/null) || true

  if [[ -z "$item_id" ]]; then
    node_id=$(echo "$issue_json" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['repository']['issue']['id'])")
    cat > "$TMPDIR/add.json" <<EOF
{"query":"mutation(\$p:ID!,\$c:ID!){ addProjectV2ItemById(input:{projectId:\$p contentId:\$c}){ item { id } } }","variables":{"p":"$PROJECT_ID","c":"$node_id"}}
EOF
    item_id=$(gh api graphql --input "$TMPDIR/add.json" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['addProjectV2ItemById']['item']['id'])")
    echo "#$num added to project"
  fi

  cat > "$TMPDIR/update.json" <<EOF
{"query":"mutation(\$p:ID!,\$i:ID!,\$f:ID!,\$o:String!){ updateProjectV2ItemFieldValue(input:{projectId:\$p itemId:\$i fieldId:\$f value:{singleSelectOptionId:\$o}}){ projectV2Item { id } } }","variables":{"p":"$PROJECT_ID","i":"$item_id","f":"$FIELD_ID","o":"$OPT"}}
EOF
  gh api graphql --input "$TMPDIR/update.json" >/dev/null
  echo "#$num -> $STATUS_NAME"
done
