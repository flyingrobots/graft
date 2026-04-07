# CORE — Run Capture Hardening

`run_capture` in `src/mcp/tools/run-capture.ts` currently executes
arbitrary shell commands through `sh -c` and persists full stdout to
`.graft/logs/capture.log` without redaction or retention policy.

This is acceptable only as a narrowly-scoped local escape hatch. It is
not yet hardened enough for broader deployment stories, especially the
shared-daemon direction.

## Pull when

- shell escape-hatch behavior needs explicit hardening
- release readiness is blocked by raw command execution or persisted
  sensitive output
- policy profiles or daemon work make `run_capture` exposure more
  consequential

## Scope

- execution gating or explicit enable/disable posture
- output redaction for obvious secret patterns
- log retention / opt-out persistence
- tests proving sensitive-looking output is not stored verbatim
