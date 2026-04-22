---
title: "Drift sentinel — detect when docs and code diverge"
legend: WARP
lane: cool-ideas
effort: M
blocked_by:
  - WARP_stale-docs-checker
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Outline extraction (shipped)"
  - "Symbol tracking across commits (shipped)"
  - "Stale docs checker (backlog)"
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

## Implementation path

1. Wire the stale-docs-checker engine (from `WARP_stale-docs-checker`)
   into the monitor tick worker — run the check on every tick after
   file changes are detected
2. Add a pre-commit hook integration: invoke the checker, exit
   non-zero if drift is found, format output as actionable warnings
3. Implement configurable severity levels: some drift is
   informational (version number one behind), some is blocking
   (referenced symbol deleted)
4. Add a `.graft/drift-sentinel.yaml` config for: which doc files
   to watch, which symbols to ignore (intentional drift), severity
   thresholds
5. Produce machine-readable output (JSON) alongside human-readable
   warnings for CI consumption

## Why blocked by stale-docs-checker

`WARP_stale-docs-checker` is the **checking engine** — it parses
markdown for symbol references, cross-references against WARP, and
identifies stale docs. This card is the **integration layer** —
it wraps that engine into pre-commit hooks, monitor ticks, and
configurable automation. Building the sentinel without the checker
would mean reimplementing the core detection logic. **Hard
dependency.**

## Related cards

- **WARP_stale-docs-checker** (blocked_by): The checker is the
  engine; the sentinel is the automation wrapper. See above.
- **WARP_structural-drift-detection**: Broader in scope — checks
  structural facts in docs (invariant compliance, method-level
  claims, numeric assertions) beyond symbol references. The
  sentinel focuses on symbol-level drift; structural-drift-detection
  covers architectural and invariant drift. They could share the
  markdown-parsing primitive but have different detection logic.
  Not a hard dependency in either direction.
- **WARP_semantic-drift-in-sessions**: Despite "drift" in both
  names, completely different. Semantic drift tracks how an agent's
  *understanding* shifts during a reading session (holonomy).
  Drift sentinel tracks how *docs diverge from code*. No overlap.

## Effort rationale

Medium. The hard work (parsing markdown for symbol refs,
cross-referencing against WARP) lives in the stale-docs-checker.
The sentinel adds: monitor tick integration (small — tick worker
exists), pre-commit hook integration (small — hook infrastructure
exists), configuration layer (medium — needs design decisions about
severity, ignore lists, output format). The sum is M.
