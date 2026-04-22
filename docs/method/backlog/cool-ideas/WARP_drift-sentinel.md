---
title: "Drift sentinel — detect when docs and code diverge"
legend: WARP
lane: cool-ideas
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Outline extraction (shipped)"
  - "Symbol tracking across commits (shipped)"
acceptance_criteria:
  - "Given a markdown file referencing a symbol by name, the sentinel detects when that symbol has been renamed or removed"
  - "Given a markdown file documenting a function signature, the sentinel flags when the actual signature differs"
  - "Can run as a pre-commit hook and exit non-zero when drift is detected"
  - "Produces machine-readable output listing each stale reference with file, line, symbol, and nature of drift"
---

# Drift sentinel — detect when docs and code diverge

A background watcher that detects structural drift between documentation and code:

- "README says `createUser` takes 2 args, but the current signature has 3"
- "GUIDE.md references `SessionTracker` which was renamed to `GovernorTracker`"
- "CHANGELOG entry says `graft_map` returns unbounded results but it now has MAX_MAP_FILES=100"

Not a linter — a structural comparison. Uses WARP symbol tracking to find referenced symbols in markdown, then checks if those symbols still exist with the documented shape.

Could run as a daemon monitor tick or a pre-commit check. Would have caught several issues in the v0.6.0 release (moved doc paths, renamed types referenced in docs).
