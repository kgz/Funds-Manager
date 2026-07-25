#!/usr/bin/env bash
# Start an Open Design run attached to a project conversation (visible in OD UI).
#
# Usage:
#   ./bin/od-design-run.sh --issue 225 "Design funds-report-snapshots.html ..."
#   ./bin/od-design-run.sh --new-conversation "#225 Report snapshots" "Design ..."
#   ./bin/od-design-run.sh -f prompt.md
#
# Env (optional):
#   OD_PROJECT          default: funds-manager-redesign-5e1b
#   OD_CONVERSATION     default: main project conversation (see below)
#   OD_DAEMON_URL       default: http://127.0.0.1:28585
#   OD_WEB_URL          default: http://127.0.0.1:29013
#   OD_AGENT_ID         default: cursor-agent
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="${OD_PROJECT:-funds-manager-redesign-5e1b}"
CONVERSATION="${OD_CONVERSATION:-66c8b7e4-40d6-4a43-b0bd-346a3ee68e4b}"
DAEMON="${OD_DAEMON_URL:-http://127.0.0.1:28585}"
WEB="${OD_WEB_URL:-http://127.0.0.1:29013}"
AGENT="${OD_AGENT_ID:-cursor-agent}"

ISSUE=""
NEW_CONV_TITLE=""
PROMPT_FILE=""
PROMPT=""

while [[ $# -gt 0 ]]; do
	case "$1" in
		--issue)
			ISSUE="${2:?}"
			shift 2
			;;
		--new-conversation)
			NEW_CONV_TITLE="${2:?}"
			shift 2
			;;
		-f|--file)
			PROMPT_FILE="${2:?}"
			shift 2
			;;
		-h|--help)
			sed -n '2,20p' "$0"
			exit 0
			;;
		--)
			shift
			break
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

if [[ -n "$PROMPT_FILE" ]]; then
	PROMPT="$(cat "$PROMPT_FILE")"
elif [[ $# -gt 0 ]]; then
	PROMPT="$*"
else
	echo "Provide a prompt message or -f prompt.md" >&2
	exit 1
fi

if ! curl -sf --max-time 2 "$DAEMON/api/daemon/status" >/dev/null; then
	echo "Open Design daemon not reachable at $DAEMON" >&2
	echo "Start it: cd ~/tools/open-design && pnpm exec tools-dev run web --web-port 29013 --daemon-port 28585" >&2
	exit 1
fi

if [[ -n "$NEW_CONV_TITLE" ]]; then
	CONVERSATION="$(
		curl -sf -X POST "$DAEMON/api/projects/$PROJECT/conversations" \
			-H 'Content-Type: application/json' \
			-d "$(python3 -c 'import json,sys; print(json.dumps({"title": sys.argv[1], "sessionMode": "design"}))' "$NEW_CONV_TITLE")" \
		| python3 -c 'import json,sys; print(json.load(sys.stdin)["conversation"]["id"])'
	)"
	echo "Created conversation: $CONVERSATION"
fi

if [[ -n "$ISSUE" ]]; then
	"$ROOT/bin/board-status.sh" in-progress "$ISSUE"
fi

payload="$(
	PROMPT="$PROMPT" PROJECT="$PROJECT" CONVERSATION="$CONVERSATION" AGENT="$AGENT" python3 <<'PY'
import json, os
print(json.dumps({
    "projectId": os.environ["PROJECT"],
    "conversationId": os.environ["CONVERSATION"],
    "message": os.environ["PROMPT"],
    "agentId": os.environ["AGENT"],
}))
PY
)"

response="$(curl -sf -X POST "$DAEMON/api/runs" -H 'Content-Type: application/json' -d "$payload")"
run_id="$(echo "$response" | python3 -c 'import json,sys; print(json.load(sys.stdin)["runId"])')"
conv_id="$(echo "$response" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("conversationId") or "")')"

watch_url="$WEB/projects/$PROJECT/conversations/${conv_id:-$CONVERSATION}"

echo "Run started: $run_id"
echo "Watch live:  $watch_url"
echo "Project:     $PROJECT"
echo "Conversation: ${conv_id:-$CONVERSATION}"
