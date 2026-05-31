#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC_PATH="$ROOT_DIR/docs/github-issues-mirroring.md"
GH_TIMEOUT_SECONDS=8

printf '%s\n' "Checking GitHub issue visibility health..."
FAIL_COUNT=0

if [[ -f "$DOC_PATH" ]]; then
  echo "✓ docs/github-issues-mirroring.md exists"
else
  echo "✗ docs/github-issues-mirroring.md missing"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

for template in 00-bug-report.md 01-feature-or-capability.md 02-bad-code.md 03-cool-idea.md; do
  if [[ -f "$ROOT_DIR/.github/ISSUE_TEMPLATE/$template" ]]; then
    echo "✓ issue template: $template"
  else
    echo "✗ issue template missing: $template"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
done

if [[ -f "$ROOT_DIR/.github/PULL_REQUEST_TEMPLATE.md" ]]; then
  echo "✓ pull request template exists"
else
  echo "✗ pull request template missing"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

if ! command -v rg >/dev/null 2>&1; then
  echo "rg missing: this check still works, but local token checks are reduced."
else
  if rg -q "issue:\\s*https://github.com/.*/issues/" "$DOC_PATH"; then
    echo "✓ docs require issue backlink field"
  else
    echo "✗ docs missing issue backlink field guidance"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not installed. Install and run with auth to perform remote Issue health checks."
  exit 0
fi
if ! command -v timeout >/dev/null 2>&1; then
  echo "timeout utility not available; cannot safely run remote checks."
  exit 0
fi

if ! timeout "$GH_TIMEOUT_SECONDS" gh auth status >/dev/null 2>&1; then
  echo "gh auth not configured. Remote health checks are unavailable."
  echo "When authenticated, run:"
  echo "  gh issue list --state open --json number,title,labels --jq '.[] | select((.labels | map(.name) | map(startswith(\"lane:\")) | any) == false) | \"#\" + (.number|tostring) + \" \" + .title + \" [missing lane label]\"'"
  echo "  gh issue list --state open --json number,title,labels,body --jq '.[] | select(.body == null or (.body | test(\"docs/(method/backlog|design)\"; \"i\") | not)) | \"#\" + (.number|tostring) + \" \" + .title + \" [missing backlog/design linkage]\"'"
  exit 0
fi

echo "Running remote health checks with gh auth..."
echo

missing_lane=$(timeout "$GH_TIMEOUT_SECONDS" gh issue list --state open --json number,labels --jq '.[] | select((.labels | map(.name) | map(startswith("lane:")) | any) == false) | .number')
if [[ -n "$missing_lane" ]]; then
  count=$(echo "$missing_lane" | wc -l | tr -d ' ')
  echo "✗ open issues missing lane label: $count"
  echo "$missing_lane" | sed 's/^/#/' | head -n 5
  FAIL_COUNT=$((FAIL_COUNT + 1))
else
  echo "✓ all open issues with labels include at least one lane label"
fi

missing_backlog=$(timeout "$GH_TIMEOUT_SECONDS" gh issue list --state open --json number,body --jq '.[] | select(.body == null or (.body | test("docs/(method/backlog|design)"; "i") | not)) | .number')
if [[ -n "$missing_backlog" ]]; then
  count=$(echo "$missing_backlog" | wc -l | tr -d ' ')
  echo "✗ open issues missing docs/backlog/design reference: $count"
  echo "$missing_backlog" | sed 's/^/#/' | head -n 5
  FAIL_COUNT=$((FAIL_COUNT + 1))
else
  echo "✓ open issue bodies include expected backlog/design references"
fi

echo
echo "Tip: expand checks above with specific labels if needed (for example lane:bad-code)."

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  echo
  echo "Health check failed with $FAIL_COUNT issue category(ies)."
  exit 1
fi
