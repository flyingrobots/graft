#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Update VISION.md frontmatter with current repo metrics.
# Run before tagging a release.
# ---------------------------------------------------------------------------
set -euo pipefail

VISION="docs/VISION.md"

if [ ! -f "$VISION" ]; then
  echo "error: $VISION not found — run from project root" >&2
  exit 1
fi

# Derive metrics
# Cycle count: highest cycle number from retro directory names (handles gaps like skipped 0007)
cycles=$(ls docs/method/retro/ | grep -oE '^[0-9]+' | sort -n | tail -1 | sed 's/^0*//')
# Test count: match "Tests  N passed" (not "Test Files")
tests=$(pnpm test 2>&1 | grep -E '^\s+Tests\s' | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+')
backlog=$(find docs/method/backlog -name '*.md' -not -name 'README*' 2>/dev/null | wc -l | tr -d ' ')
version=$(node -p "require('./package.json').version")
commit=$(git rev-parse HEAD)

echo "Updating $VISION frontmatter:"
echo "  cycles_completed: $cycles"
echo "  tests: $tests"
echo "  backlog_items: $backlog"
echo "  version: $version"
echo "  commit: $commit"

# Update frontmatter fields in place
sed -i '' "s/^cycles_completed: .*/cycles_completed: $cycles/" "$VISION"
sed -i '' "s/^tests: .*/tests: $tests/" "$VISION"
sed -i '' "s/^backlog_items: .*/backlog_items: $backlog/" "$VISION"
sed -i '' "s/^version: .*/version: $version/" "$VISION"
sed -i '' "s/^commit: .*/commit: $commit/" "$VISION"
sed -i '' "s/^generated: .*/generated: $(date +%Y-%m-%d)/" "$VISION"

echo "Done. Review prose sections manually before release."
