---
title: "top-level directories mix hex layers and force file-level guardrails"
legend: CLEAN
lane: bad-code
---

# top-level directories mix hex layers and force file-level guardrails

`0076` could only enforce truthful import-direction rules with file-level globs because some top-level directories still mix architectural roles. `src/git/` contains both application behavior (`diff.ts`) and adapter-ish hook bootstrap (`target-git-hook-bootstrap.ts`). `src/metrics/` contains both pure value types (`types.ts`) and adapter-ish logging (`logger.ts`). This blocks simple directory-level dependency guardrails and keeps the architecture map more fragile than it should be.
