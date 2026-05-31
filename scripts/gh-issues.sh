#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC_PATH="docs/github-issues-mirroring.md"
GH_TIMEOUT_SECONDS=8
REQUIRED_LABELS=(
  "lane:asap|Track in docs/method/backlog/asap|"
  "lane:up-next|Track in docs/method/backlog/up-next|"
  "lane:bad-code|Track explicit technical debt in docs/method/backlog/bad-code|"
  "lane:cool-idea|Track non-blocking idea in docs/method/backlog/cool-ideas|"
  "scope:core|Core system scope|0E8A16"
  "scope:warp|WARP ontology/path/causal scope|A2EEEF"
  "scope:surface|MCP/CLI/daemon surface scope|A0A0F0"
  "scope:daemon|Daemon runtime scope|D4C5F9"
  "p0|Critical risk|D73A4A"
  "p1|High severity|D93F0B"
  "p2|Medium severity|FBCA04"
  "p3|Low priority|0E8A16"
)

command -v gh >/dev/null 2>&1 || {
  echo "gh CLI is required: https://cli.github.com/" >&2
  exit 1
}
command -v rg >/dev/null 2>&1 || {
  echo "rg is required for label presence checks: https://github.com/BurntSushi/ripgrep" >&2
  exit 1
}
command -v timeout >/dev/null 2>&1 || {
  echo "timeout utility is required for this script." >&2
  exit 1
}

run_gh() {
  timeout "$GH_TIMEOUT_SECONDS" gh "$@"
}

mode="${1:-bootstrap}"
case "$mode" in
  bootstrap|--bootstrap)
    ;;
  *)
    echo "Usage: scripts/gh-issues.sh [bootstrap]" >&2
    exit 1
    ;;
esac

if ! timeout "$GH_TIMEOUT_SECONDS" gh auth status >/dev/null 2>&1; then
  echo "gh auth not configured or token invalid. Run: gh auth login -h github.com"
  exit 1
fi

echo "Bootstrapping GitHub Issue labels for Graft..."
echo
for entry in "${REQUIRED_LABELS[@]}"; do
  IFS='|' read -r name description color <<< "$entry"
  if run_gh label list --search "$name" --limit 1 --json name --jq '.[0].name' | rg -q "^$name$"; then
    if [[ -n "$color" ]]; then
      run_gh label edit "$name" --description "$description" --color "$color" >/dev/null
    else
      run_gh label edit "$name" --description "$description" >/dev/null
    fi
    echo "✓ updated $name"
  else
    if [[ -n "$color" ]]; then
      run_gh label create "$name" --description "$description" --color "$color" >/dev/null
    else
      run_gh label create "$name" --description "$description" >/dev/null
    fi
    echo "✓ created $name"
  fi
done

echo
echo "Label mirror bootstrap complete."
echo "Next, keep issue and backlog links in sync:"
echo "  - Issue -> docs/method/backlog and docs/design via $(cd "$ROOT_DIR" && printf '%s' "$DOC_PATH")"
echo "  - PR descriptions should reference issue + card/design paths"
echo
echo "Tip: open docs/github-issues-mirroring.md for the full flow and template reminders."
exit 0
