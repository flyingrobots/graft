---
title: "graft doctor — structural health sweep"
feature: surface
kind: leaf
legend: CORE
lane: cool-ideas
effort: M
requirements:
  - "drift-sentinel (shipped)"
  - "structural-drift-detection (shipped)"
  - "checkVersionDrift (shipped)"
acceptance_criteria:
  - "A single 'graft doctor' command runs all integrity checks: drift-sentinel, structural-drift, version-drift"
  - "Produces a unified health report with pass/fail per check"
  - "Exit code reflects overall health (0 = clean, 1 = issues found)"
  - "Usable as a CI step or pre-commit hook"
---

# graft doctor — structural health sweep

Run all the integrity checks we built in one sweep:
drift-sentinel, structural-drift-detection, checkVersionDrift.

Like `pnpm lint` but for structural integrity. One command,
one report, one exit code.

"Your codebase has 3 stale doc references, 1 version drift,
and 0 invariant violations."
