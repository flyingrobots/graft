---
title: "port runtime contract seams"
legend: CLEANCODE
lane: bad-code
---

# port runtime contract seams

The environment-facing ports still rely too heavily on interface-only discipline. Treat `filesystem` and `codec` as one runtime-contract problem so the core does not depend on adapter goodwill for its most important boundary guarantees.
