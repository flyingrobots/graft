# Every policy decision is logged

**Legend:** CORE

Every call to `evaluatePolicy()` produces an NDJSON log entry
in `.graft/logs/decisions.ndjson` with the input path, policy
result, reason code, and timestamp.

## If violated

No audit trail. Cannot debug why a file was refused or why an
agent got an outline instead of content. Post-incident analysis
is impossible.

## How to verify

- Metrics logger is called from the `respond` path
- Decision log tests verify entries are written for each
  projection type
