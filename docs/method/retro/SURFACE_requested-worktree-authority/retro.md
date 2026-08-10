---
title: "Requested worktree authority"
cycle: "SURFACE_requested-worktree-authority"
design_doc: "docs/design/SURFACE_requested-worktree-authority.md"
source_issue: "https://github.com/flyingrobots/graft/issues/238"
outcome: hill-met
drift_check: manual
---

# Requested worktree authority Retro

## Outcome

Issue #238's remaining authority gap is closed locally. An explicit daemon
route now carries one immutable `WorkspaceRouteEvidence` from resolution
through the execution context and child-process worker boundary. Every routed
result exposes that evidence as `_workspace`, and its receipt repeats the same
facts as `_receipt.workspace`.

The proof uses two worktrees of one repository with different branch commits
and different dirty overlays. With the session active on the secondary
worktree, `graft_since` against the primary reports only the primary symbol;
the reversed request reports only the secondary symbol. Both results share a
`repoId`, have distinct `worktreeId` values, and leave the active binding
unchanged.

Missing routed roots now throw `WorkspaceResolutionError` with the resolution
code. Unauthorized roots retain `WorkspaceRouteUnauthorizedError`. Optional
`repoId`, `worktreeRoot`, and `gitCommonDir` hints are checked against Git's
resolved identity and return `WORKSPACE_IDENTITY_MISMATCH` instead of being
silently ignored.

## Playback

1. **Can an explicit route select worktree A while B is active?** Yes. The
   bidirectional regression reports `onlyInPrimary` and `onlyInSecondary` only
   from their selected worktrees.
2. **Is the selection inspectable?** Yes. Response and receipt expose identical
   requested/resolved roots and repository/worktree identities, and the
   declared output schema accepts them.
3. **Does resolution fail closed?** Yes. Missing, unauthorized, and
   contradictory requests retain typed machine-readable failures; none falls
   back to the active binding.
4. **Did the route architecture change?** No. The existing non-mutating
   `WorkspaceRouter` execution-context route remains intact. This cycle added
   evidence propagation, identity-hint validation, and the missing proof.
5. **Did existing behavior survive?** Yes. The complete isolated suite passes
   258 files and 2,051 tests, including repo-local, daemon, worker, schema, and
   path-boundary surfaces.

## Review Repair

Exact-head Codex review found one P1 contract-version error: the new optional
workspace evidence expanded strict routed MCP and CLI peer outputs while most
still advertised schema version `1.0.0`. The repair moved the routed-tool names
into the capability contract, reused that authority for daemon scheduling and
output metadata, and advanced every affected output to `2.0.0`. This avoids a
second independently maintained version list and keeps unrelated contracts at
their existing versions.

## Drift

The implementation matches the design packet. Scope did not expand into
structural diff semantics, a routing rewrite, Echo integration,
`StructuralReadingPort`, git-warp import, daemon dashboards, PR #233 salvage,
or unrelated cleanup.

The test design changed once during RED: `graft_since` compares Git refs and
does not include the dirty workspace overlay. The final fixture therefore
creates distinct branch commits from one common base and separately leaves
both worktrees dirty. That preserves the intended routing proof without
changing the command's semantics.

## Findings

- The existing per-call route was already structurally sound. The dangerous
  remaining gaps were lack of same-repository/two-worktree proof, lack of
  response/receipt evidence, generic resolution failures, and ignored identity
  hints.
- Evidence must be attached in the receipt builder, not individually in ten
  tool handlers, or inline and worker-backed tools can drift apart.
- The active-worktree branch of route reuse also needs explicit route evidence;
  reusing the binding must not erase the caller's authority declaration.

## Debt and Ideas

No new backlog cards were filed. The next architectural work remains the
already-planned issue #228 First Retained Workspace Observation vertical using
an unknown-basis request.
