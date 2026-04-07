# Cycle 0028 — Test Isolation and Sandbox Audit

**Hill:** When the test suite exercises real MCP surfaces, it runs
inside an explicit sandbox instead of inheriting the developer's live
repo state.

**Outcome:** Met.

## What shipped

- `createGraftServer` now accepts explicit `projectRoot` and `graftDir`
  overrides so tests can build real MCP servers against known
  sandboxes
- Added `test/helpers/mcp.ts` as the shared MCP test harness for:
  isolated server construction, absolute fixture paths, and response
  parsing
- Added `test/helpers/mcp-stdio.ts` as a test-only stdio entrypoint so
  the integration suite can start the real MCP server with explicit
  sandbox inputs
- Migrated the MCP unit suites that were inheriting live repo state to
  use isolated servers or temp repos directly
- Migrated the stdio integration suite to use a temp `projectRoot` and
  temp `graftDir` instead of the live repo `.graft` directory
- Removed the last `state_load` cwd hack from MCP tool tests
- Verified the full suite, lint, and typecheck all pass after the
  isolation changes

## Playback

- Agent: if a developer has stale `.graft` state, do MCP tests still
  pass from a clean sandbox? **Yes.**
- Agent: does the stdio integration test use an explicit sandbox rather
  than the live repo `.graft` directory? **Yes.**
- Agent: do the tests still exercise the real MCP surface instead of a
  mock? **Yes.**
- Operator: can the suite run without hidden local warm state?
  **Yes.**
- Operator: are integration-by-design tests explicit about their
  sandbox boundary? **Yes.**
- Operator: did this cycle avoid broadening into a Docker mandate?
  **Yes.**

## Lessons

- `process.cwd()` is too blunt a dependency for MCP tests. If a test
  cares about repo truth, it should pass that root explicitly.
- MCP stdio tests have a subtle trap: the SDK inherits only a safe env
  allowlist by default, so sandbox-specific values must be passed
  explicitly.
- Real-surface tests do not need mocks to be isolated. They need
  explicit construction boundaries.

## Follow-on work

- Cycle 0029: `docs/method/retro/0029-markdown-summary-support/retro.md`
- Cycle 0030: `docs/method/retro/0030-policy-fidelity-audit/retro.md`
- `docs/method/backlog/asap/CORE_versioned-json-output-schemas.md`
