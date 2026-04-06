# Cycle 0028 — Test Isolation and Sandbox Audit

**Sponsor human:** Repository Operator
**Sponsor agent:** Verification Agent

## Premise

Several MCP tests were still passing only because they inherited the
current repo's cwd, `.graft` state, and live machine context.

That is not a trustworthy test posture.

Graft makes claims about bounded, truthful reads and controlled tool
behavior. The test suite must prove those claims from a cold start,
without relying on warm local state.

## Hill

When the test suite exercises real MCP surfaces, it runs inside an
explicit sandbox instead of inheriting the developer's live repo state.

## Playback questions

### Agent perspective

- If a developer has stale `.graft/state.md` or other repo-local MCP
  state, do MCP tests still pass from a clean sandbox? **Must be yes.**
- If the stdio integration test starts a real MCP server, does it use
  an explicit sandbox instead of this repo's live `.graft` directory?
  **Must be yes.**
- Can MCP tests still exercise the real tool surface without swapping
  it out for mocks? **Must be yes.**

### Operator perspective

- Can I run the suite on a new machine or CI runner without needing
  hidden local warm state? **Must be yes.**
- Are integration-by-design tests explicit about what they sandbox and
  what repo fixtures they intentionally reuse? **Must be yes.**
- Does this cycle avoid broadening into a Docker mandate for every
  single test? **Must be yes.**

## Non-goals

- Containerizing the entire test suite
- Rewriting real MCP tests into mocks
- Solving every future network/process isolation concern in one pass
- Introducing a new production control plane just for tests

## Design

### Explicit server construction

`createGraftServer` should accept explicit `projectRoot` and `graftDir`
overrides.

That lets tests build a real MCP server against a known sandbox without
changing production defaults.

### Shared sandboxed test helpers

Test code should stop open-coding cwd tricks and live-repo inheritance.

Add shared helpers that:
- create isolated MCP servers
- keep `.graft` state in temp directories
- provide absolute fixture paths for controlled repo fixtures
- provide a test-only stdio entrypoint for the MCP integration suite

### Integration-by-design boundary

The stdio integration test should still hit the real MCP protocol, but
it must do so with:
- an explicit temp `projectRoot`
- an explicit temp `graftDir`
- a test-owned entrypoint that wires those values into
  `createGraftServer`

Repo fixture files are allowed inputs as long as they are addressed
explicitly and the server state itself stays sandboxed.

## Deliverables

1. Audit the MCP/unit/integration tests for cwd-bound state leakage
2. Add explicit server-construction overrides for sandboxes
3. Move affected tests to shared isolated helpers
4. Prove the full suite still passes from that posture

## Effort

S
