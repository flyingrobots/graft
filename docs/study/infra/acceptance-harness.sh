#!/usr/bin/env bash
# Study acceptance harness — runs task-specific checks and reports pass/fail.
# Usage: ./acceptance-harness.sh <task-id>
#
# Reads the task card YAML, extracts automated acceptance criteria,
# and runs each one. Outputs JSON result.
#
# SECURITY: This harness uses bash -c to execute criteria from frozen
# task cards. It MUST only be run against trusted, versioned task cards
# committed to this repository. Never point it at untrusted input.

set -euo pipefail

# Dependency check
if ! command -v python3 &>/dev/null; then
  echo "{\"task\": \"unknown\", \"pass\": false, \"error\": \"python3 required but not found\"}"
  exit 1
fi

TASK_ID="${1:?Usage: acceptance-harness.sh <task-id>}"
TASK_DIR="$(cd "$(dirname "$0")/../tasks" && pwd)"
TASK_FILE="$(find "$TASK_DIR" -name "${TASK_ID}-*.yaml" -o -name "${TASK_ID}-*.yml" | head -1)"

if [ -z "$TASK_FILE" ]; then
  echo "{\"task\": \"$TASK_ID\", \"pass\": false, \"error\": \"Task card not found\"}"
  exit 1
fi

# Extract automated acceptance criteria (lines between 'automated:' and next key)
CRITERIA=$(awk '/^  automated:$/,/^  [a-z]/' "$TASK_FILE" \
  | grep '^ *- "' \
  | sed 's/^ *- "//; s/"$//')

if [ -z "$CRITERIA" ]; then
  echo "{\"task\": \"$TASK_ID\", \"pass\": false, \"error\": \"No automated criteria found\"}"
  exit 1
fi

RESULTS="[]"
ALL_PASS=true

while IFS= read -r criterion; do
  # Parse criterion: "command exits N" or "command" (implicit exit 0)
  if echo "$criterion" | grep -q ' exits '; then
    CMD=$(echo "$criterion" | sed 's/ exits [0-9]*$//')
    EXPECTED_EXIT=$(echo "$criterion" | grep -o '[0-9]*$')
  else
    CMD="$criterion"
    EXPECTED_EXIT=0
  fi

  # Run the criterion in a subshell to isolate side effects.
  # Uses bash -c instead of eval for slightly better containment.
  set +e
  OUTPUT=$(bash -c "$CMD" 2>&1)
  ACTUAL_EXIT=$?
  set -e

  if [ "$ACTUAL_EXIT" -eq "$EXPECTED_EXIT" ]; then
    PASS=true
  else
    PASS=false
    ALL_PASS=false
  fi

  # JSON-escape the criterion string via python3
  ESCAPED=$(printf '%s' "$criterion" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
  ENTRY="{\"criterion\": $ESCAPED, \"pass\": $PASS, \"exit_code\": $ACTUAL_EXIT, \"expected\": $EXPECTED_EXIT}"
  if [ "$RESULTS" = "[]" ]; then
    RESULTS="[$ENTRY"
  else
    RESULTS="$RESULTS, $ENTRY"
  fi
done <<< "$CRITERIA"

RESULTS="$RESULTS]"

echo "{\"task\": \"$TASK_ID\", \"pass\": $ALL_PASS, \"criteria\": $RESULTS}"
