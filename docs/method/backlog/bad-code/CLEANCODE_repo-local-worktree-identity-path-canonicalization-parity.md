---
title: "Repo-local worktree identity path canonicalization parity"
legend: CLEANCODE
lane: bad-code
---

# Repo-local worktree identity path canonicalization parity

Repo-local CLI/server flows and `resolveWorkspaceRequest()` can disagree on worktree identity when the same checkout is addressed through path aliases like `/tmp/...` and `/private/tmp/...`. This surfaced while implementing `diag local-history-dag`: WARP local-history nodes were present, but the command filtered them out because the graph write path and the read-side workspace resolution derived different `worktreeId` values for the same checkout.

Expected posture:
- one checkout should map to one stable worktree identity regardless of path aliasing
- repo-local binding, persisted local history, and debug/read surfaces should agree on that identity
- callers should not need to implement graph-side worktree fallback logic to recover from identity drift

Likely fix direction:
- normalize/canonicalize worktree roots at the binding/resolution seam before deriving `worktreeId`
- ensure repo-local `createGraftServer()` and `resolveWorkspaceRequest()` follow the same path posture
- add regression coverage for `/tmp` vs `/private/tmp` style aliasing on worktree identity
