#!/usr/bin/env bash
set -euo pipefail

fail=0

require_rg() {
  if ! command -v rg >/dev/null 2>&1; then
    echo "ERROR: ripgrep (rg) is required for scripts/check-anti-sludge.sh" >&2
    exit 2
  fi
}

require_rg

check_pattern() {
  local label="$1"
  local regex="$2"
  shift 2

  if rg --line-number --glob '*.ts' "$regex" "$@"; then
    echo ""
    echo "FAIL: ${label}" >&2
    fail=1
  fi
}

check_filenames() {
  local matches
  matches="$(find src -type f \( \
    -name 'utils.ts' -o \
    -name 'helpers.ts' -o \
    -name 'misc.ts' -o \
    -name 'common.ts' \
  \) -print || true)"

  if [[ -n "$matches" ]]; then
    echo "$matches"
    echo ""
    echo "FAIL: junk-drawer module names are banned" >&2
    fail=1
  fi
}

if [[ ! -d src ]]; then
  echo "No src/ directory found. Adjust scripts/check-anti-sludge.sh to match your repo layout." >&2
  exit 0
fi

check_filenames

core_paths=()
for path in src/contracts src/guards src/ports src/operations src/policy src/parser src/session; do
  if [[ -d "$path" ]]; then
    core_paths+=("$path")
  fi
done

check_pattern 'placeholder *Like types are banned' '\b[A-Z][A-Za-z0-9]*Like\b' src
check_pattern '`as unknown as` is banned' 'as\s+unknown\s+as' src

if [[ ${#core_paths[@]} -gt 0 ]]; then
  check_pattern 'JSON.parse is banned in core' 'JSON\.parse\s*\(' "${core_paths[@]}"
  check_pattern 'JSON.stringify is banned in core' 'JSON\.stringify\s*\(' "${core_paths[@]}"
  check_pattern 'fetch is banned in core' '\bfetch\s*\(' "${core_paths[@]}"
  check_pattern 'process.env is banned in core' 'process\.env' "${core_paths[@]}"
  check_pattern 'Date.now is banned in core' 'Date\.now\s*\(' "${core_paths[@]}"
  check_pattern 'new Date is banned in core' 'new\s+Date\s*\(' "${core_paths[@]}"
  check_pattern 'Math.random is banned in core' 'Math\.random\s*\(' "${core_paths[@]}"
fi

if [[ "$fail" -ne 0 ]]; then
  echo ""
  echo "Anti-SLUDGE checks failed." >&2
  exit 1
fi

echo "Anti-SLUDGE checks passed."
