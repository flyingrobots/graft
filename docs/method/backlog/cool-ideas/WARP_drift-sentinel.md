---
title: "Drift sentinel — detect when docs and code diverge"
legend: WARP
lane: cool-ideas
---

# Drift sentinel — detect when docs and code diverge

A background watcher that detects structural drift between documentation and code:

- "README says `createUser` takes 2 args, but the current signature has 3"
- "GUIDE.md references `SessionTracker` which was renamed to `GovernorTracker`"
- "CHANGELOG entry says `graft_map` returns unbounded results but it now has MAX_MAP_FILES=100"

Not a linter — a structural comparison. Uses WARP symbol tracking to find referenced symbols in markdown, then checks if those symbols still exist with the documented shape.

Could run as a daemon monitor tick or a pre-commit check. Would have caught several issues in the v0.6.0 release (moved doc paths, renamed types referenced in docs).
