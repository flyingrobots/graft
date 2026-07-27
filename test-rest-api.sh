#!/usr/bin/env bash
set -euo pipefail

BASE="https://graft-rebh.onrender.com"
REPO="https://github.com/octocat/Hello-World.git"

echo "1. Creating sandbox session..."
SESSION="$(
  curl --silent --show-error --fail-with-body \
    --connect-timeout 20 \
    --max-time 180 \
    --request POST "$BASE/sessions" \
    --header "Accept: application/json" \
    --header "Content-Type: application/json" \
    --data "$(jq -nc --arg repo "$REPO" '{repositoryUrl: $repo}')"
)"

echo "$SESSION" | jq .
SESSION_ID="$(jq -er '.sessionId | select(type == "string" and length > 0)' <<<"$SESSION")"

echo
echo "2. Listing tools for session $SESSION_ID..."
TOOLS="$(
  curl --silent --show-error --fail-with-body \
    --connect-timeout 20 \
    --max-time 60 \
    --header "Accept: application/json" \
    "$BASE/sessions/$SESSION_ID/tools"
)"

echo "$TOOLS" | jq .
jq -e '.tools | type == "array"' <<<"$TOOLS" >/dev/null

echo
echo "3. Looking for the read-only capabilities tool..."
if jq -e '.tools[]? | select(.name == "capabilities")' \
  <<<"$TOOLS" >/dev/null; then

  jq '.tools[] | select(.name == "capabilities")' <<<"$TOOLS"

  RESULT="$(
    curl --silent --show-error --fail-with-body \
      --connect-timeout 20 \
      --max-time 60 \
      --request POST "$BASE/sessions/$SESSION_ID/tools/capabilities" \
      --header "Accept: application/json" \
      --header "Content-Type: application/json" \
      --data '{}'
  )"

  echo "$RESULT" | jq .
  jq -e '
    .isError == false
    and (.content | type == "array")
  ' <<<"$RESULT" >/dev/null

  echo
  echo "PASS: session creation, tool discovery, and tool execution succeeded."
else
  echo "No capabilities tool was advertised."
  echo "PASS: session creation and tool discovery succeeded."
  echo "Inspect the returned schemas before invoking another tool."
fi
