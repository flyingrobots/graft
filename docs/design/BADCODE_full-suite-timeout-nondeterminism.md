---
title: "Full-suite timeout nondeterminism"
feature: test-infrastructure
kind: bug
legend: BADCODE
lane: bad-code
priority: release-blocking
status: completed
retro: "docs/method/retro/BADCODE_full-suite-timeout-nondeterminism/retro.md"
acceptance_criteria:
  - "Full `pnpm test` behavior is deterministic under normal full-suite load, or timeout/isolation hardening is explicitly implemented and documented"
  - "No shared daemon, socket, temp directory, or git repository state leaks across tests"
  - "No tests use the live Graft checkout as subject data"
  - "Reproduction notes and resolution evidence are captured honestly in the retro"
---

# Full-suite timeout nondeterminism

## Why

During `SURFACE_bijou-daemon-status-first-slice` validation, the full
`pnpm test` run hit timeout failures under full-suite load:

- `test/unit/mcp/precision.test.ts`
- `test/unit/policy/cross-surface-parity.test.ts`

An isolated rerun of those files passed, and a later full-suite rerun
also passed. That is still nondeterministic behavior. A pass-on-rerun is
not a valid release signal.

## Observed sequence

1. Focused daemon-status tests passed.
2. Full `pnpm test` failed with two 5s timeout failures.
3. Isolated rerun of the affected files passed.
4. Full `pnpm test` rerun passed.

## Risk

The failure pattern suggests timing pressure, hidden coupling, leaked
processes, shared temp/socket state, or another full-suite resource
contention problem. Graft should not treat nondeterministic validation
as green, especially for a release branch.

## Root Cause

Two test-infrastructure seams made tiny tests too expensive and too dependent
on ambient process state under full-suite load:

- `createServerInRepo` used the production Git adapter and allowed repo-local
  server initialization to eagerly open the persisted local-history WARP graph.
- daemon integration tests spawned the default child-process worker pool and
  performed persisted local-history graph setup even when the test only needed
  daemon transport or worker execution behavior.

The post-fix full-suite run also exposed a schema mismatch: `causal_status`
can report `activeCausalWorkspace.repoConcurrency: null`, and the declared
schema did not allow that shape.

## Design

Keep production defaults intact, but make tests explicit about isolation and
runtime budget:

- inject an isolated temp-only Git client into test MCP servers
- disable eager persisted local-history graph writes in `createServerInRepo`
  unless a test opts in
- add daemon test options for worker-pool size and persisted-history graph
  participation
- run daemon integration tests with one real child-process worker and no
  unrelated persisted-history graph writes
- update the causal status schemas to match observed nullable repo concurrency

## Acceptance

- reproduce and explain the timeout pressure, or prove the specific
  race/shared-state path that was eliminated
- harden test isolation or timeout boundaries so full-suite validation
  is deterministic
- confirm daemon/socket/temp resources are created under isolated paths
  and cleaned up
- confirm no test uses `/Users/james/git/graft` as subject repository
  data
- document the final deterministic validation evidence

## Verification

- `pnpm exec vitest run test/unit/helpers/git.test.ts test/unit/helpers/mcp.test.ts test/unit/mcp/precision.test.ts test/unit/policy/cross-surface-parity.test.ts`
- `pnpm exec vitest run test/unit/contracts/output-schemas.test.ts test/integration/mcp/daemon-server.test.ts test/integration/mcp/daemon-bridge.test.ts test/integration/mcp/daemon-status-cli.test.ts`
- `git diff --check`
- `pnpm typecheck`
- `pnpm lint`
- `env -u GIT_DIR -u GIT_WORK_TREE -u GIT_WARP_HOME pnpm test`
