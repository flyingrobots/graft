---
title: "Graft is three majors behind git-warp with no drift signal"
feature: warp
kind: bad-code
legend: WARP
lane: bad-code
priority: 2
effort: M
status: open
reported: 2026-09-23
owner: flyingrobots
---

# Graft is three majors behind git-warp with no drift signal

## Problem and evidence

`package.json` declares `"@git-stunts/git-warp": "^16.0.0"`. The lockfile and
all three daemon installs under `~/.graft/installs/` (0.11.1, 0.12.0, 0.14.0)
resolve 16.0.0, published 2026-03-29. npm `latest` is 19.1.0, published
2026-08-25. That is three majors and 51 releases of drift, held for roughly
six months, and nothing in the repository reports it.

The drift became load-bearing during the daemon memory-leak repair. The fix
for the dominant cause lives in git-warp, and the only way to deliver it to a
v16 consumer was to cut a separate 16.x maintenance release
(git-stunts/git-warp#884) alongside the main-line fix
(git-stunts/git-warp#883). A backport per incident is not a strategy.

The drift also silently changes configuration meaning. v16 `gcPolicy` accepts
`maxTimeSinceCompaction` (milliseconds); 17+ renames it to a tick-based
bound. git-warp ignores unknown `gcPolicy` fields rather than rejecting them,
so a config written against the wrong major is accepted and does nothing.
`src/warp/open.ts` now pins the v16 spelling with a test that checks the field
names against the installed `index.d.ts`, but that test only proves agreement
with whatever is installed — it cannot tell anyone the pin is stale.

## Bounded next delivery

Decide and record the intended posture rather than drifting by default.
`docs/BEARING.md` demotes git-warp to "provenance-preserving legacy import and
temporary fallback compatibility" in favor of Echo, which is a defensible
reason to stay on 16.x — but if that is the decision, it should be written
down as a pin with an expiry condition, not left looking like neglect.

Either way, add a drift signal: a check that compares the declared range
against the registry and reports the gap, so the distance is visible without
someone going to look. Do not turn it into an automatic upgrade, and do not
bump majors without reading what changed between them.

## Until decided

Treat any git-warp fix graft needs as requiring a 16.x backport, and say so
when scoping. Do not assume a dependency bump is a small follow-up.
