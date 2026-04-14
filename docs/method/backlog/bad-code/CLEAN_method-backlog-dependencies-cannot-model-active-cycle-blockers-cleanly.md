---
title: "method backlog dependencies cannot model active-cycle blockers cleanly"
legend: CLEAN
lane: bad-code
---

# method backlog dependencies cannot model active-cycle blockers cleanly

While reconciling the queue after pulling `CORE_primary-adapters-thin-use-case-extraction`, refs from other backlog notes to the active `0077` design packet show up as `unresolvedBlockedBy` in `method_backlog_dependencies`. Today the dependency model is comfortable with live backlog-note refs, but it does not treat active cycle packets as first-class satisfiable blockers. That makes it awkward to keep dependency truth precise across the pull boundary without either stale backlog refs or unresolved active-cycle refs.
