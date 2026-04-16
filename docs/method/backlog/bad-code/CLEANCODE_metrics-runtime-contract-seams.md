---
title: "metrics runtime contract seams"
legend: CLEANCODE
lane: bad-code
---

# metrics runtime contract seams

Metrics collection still splits its boundary debt across interface-only metric event types and raw numeric accumulation helpers. Consolidate the runtime-contract work for metric events and deltas so metrics invariants are enforced at construction time instead of by caller discipline.
