---
title: "Path resolver escape invariants"
legend: HT
lane: bad-code
---

# Path resolver escape invariants

Audit source: `docs/audit/2026-04-11_ship-readiness.md`.

Problem:

The path-resolution boundary is a security seam and should have an explicit invariant suite for root escape attempts, symlink tricks, and relative-path traversal cases.

Why it matters:

- Graft's credibility depends on worktree-root confinement being mechanically defended, not just assumed
- this is a better fit for a focused invariant test suite than scattered regression tests

Desired shape:

- add a dedicated invariant suite for path resolution and root confinement
- cover `..` traversal, symlink-based escapes, awkward relative-path normalization, and denied-path reporting
- keep the tests framed around repo/worktree truth rather than only string normalization

Likely files:
- path resolver implementation
- security / invariant tests around workspace routing and bounded reads

Effort: S-M
