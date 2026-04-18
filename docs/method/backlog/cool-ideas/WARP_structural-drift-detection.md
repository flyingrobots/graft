---
title: "Structural drift detection"
---

# Structural drift detection

"Does the code still match what the docs say?"

Compare structural facts in docs (README says 12 tools, VISION
says 417 tests) against the actual WARP graph. Detect when
documentation drifts from reality.

Also: invariant drift. "The observer-only-access invariant says
no direct getNodes calls in src/. Does the code still comply?"
Walk the WARP graph and the source to verify.

Method-level: "BEARING says the direction is WARP Level 2. Has
any WARP Level 2 work actually been committed?" Check the
worldline for commit→symbol edges tagged with Level 2 work.

Depends on: WARP Level 1 (shipped), docs-match-code invariant
(existing).
