---
title: "parser layer role is architecturally ambiguous"
legend: CLEAN
lane: bad-code
---

# parser layer role is architecturally ambiguous

`0076` could not truthfully classify `src/parser/**` as a secondary adapter because current application modules in `src/operations/**` still depend on parser services directly. The repo needs an explicit decision about whether parser functionality is application-core structural service, secondary adapter behind a port, or split across both. Until that is settled, boundary enforcement has to special-case parser posture instead of enforcing a clean layer direction.
