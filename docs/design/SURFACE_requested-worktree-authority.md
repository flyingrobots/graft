---
title: "Requested worktree authority"
legend: "SURFACE"
cycle: "SURFACE_requested-worktree-authority"
source_issue: "https://github.com/flyingrobots/graft/issues/238"
status: completed
---

# Requested worktree authority

## Sponsors

- Human: James
- Agent: Codex

## Hill

An explicit `cwd` on a routed daemon read selects exactly that Git worktree,
even when another worktree of the same repository is active. The response and
receipt identify the absolute path the caller requested, the canonical
worktree root Graft resolved, and the resolved repository/worktree identities.
Missing, unauthorized, or identity-mismatched requests fail before the tool
handler performs a repository read.

This closes GitHub issue #238 without changing the existing per-call routing
architecture. `WorkspaceRouter` remains the authority boundary; this cycle
adds the missing proof, refusal fidelity, and inspectability contract.

## Acceptance Criteria

- Two worktrees of one repository carry distinct dirty changes.
- With worktree B active, `graft_since({ cwd: A, base: "HEAD" })` reports only
  A's structural change.
- Repeating the request in the other direction reports only B's change.
- Each routed response exposes `_workspace.requestedRoot`,
  `_workspace.resolvedRoot`, `_workspace.repoId`, and
  `_workspace.worktreeId`.
- Each routed receipt exposes the same workspace-route evidence.
- Previously-version-1 routed MCP tools and their direct CLI peers advertise
  schema version `2.0.0` for the expanded strict output contract;
  `file_outline` and `read_outline`, already on version `2.0.0`, advance to
  `3.0.0`.
- `requestedRoot` is the absolute caller path; `resolvedRoot` is the
  canonical Git worktree root.
- The two worktrees share `repoId` and have distinct `worktreeId` values.
- An absent or non-repository `cwd` fails closed with a typed resolution
  error.
- A routed daemon read for an unauthorized worktree fails closed with
  `WorkspaceRouteUnauthorizedError`.
- Optional `repoId`, `worktreeRoot`, and `gitCommonDir` hints, when supplied to
  a workspace request, must match the server-resolved identity or fail closed.
- The active session workspace remains unchanged after every routed read.

## Playback Questions

### Human

- [x] Can a review request name worktree A while the session is bound to B and
  receive only A's changes?
- [x] Can the response be audited without inferring which checkout Graft used?
- [x] Does every missing, unauthorized, or contradictory workspace request
  refuse instead of falling back to the active or daemon-default checkout?

### Agent

- [x] Does routing evidence survive the child-process worker boundary?
- [x] Do result and receipt carry identical requested/resolved roots and
  workspace identities?
- [x] Does a reversed A/B request prove that routing is not accidentally tied
  to test setup order?
- [x] Do existing repo-local calls and daemon calls without `cwd` retain their
  current response shape?

## Authority Model

```text
explicit cwd
  -> absolute requestedRoot
  -> Git resolves canonical worktree and common dir
  -> optional identity hints are checked, never trusted
  -> daemon authorization checks the resolved workspace
  -> immutable per-call execution context
  -> tool handler / worker
  -> response + receipt carry identical route evidence
```

Precedence is therefore explicit route, then active session binding, then no
workspace. A daemon default is never a substitute for a failed explicit route.

## Expected Test Strategy

- Extend `test/unit/mcp/per-call-workspace-route.test.ts` with one real
  same-repository/two-worktree `graft_since` proof executed in both directions.
- Assert semantic symbol changes, roots, repo/worktree identities, and unchanged
  active binding; do not assert prose or serialized field order.
- Add focused resolution tests for missing roots and contradictory identity
  hints.
- Run the existing per-call route, workspace binding, output-schema, daemon
  worker, and structural policy suites.
- Run `pnpm lint`, `pnpm typecheck`, and `git diff --check`.

## Non-goals

- No routing rewrite or new filesystem-shaped adapter.
- No change to structural diff semantics.
- No Graft-owned Edict operation or Echo request/settlement work in this PR.
- No `StructuralReadingPort` migration.
- No git-warp import, live-frontier work, or generic Continuum redesign.
- No daemon dashboard work.
- No PR #233 salvage beyond its separate time-boxed inventory.
- No unrelated cleanup.
