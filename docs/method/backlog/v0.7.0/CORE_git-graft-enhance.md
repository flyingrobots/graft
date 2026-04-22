---
title: "git graft enhance — structural annotations for git commands"
legend: CORE
lane: v0.7.0
requirements:
  - "graft_diff operation (shipped)"
  - "WARP Level 1 indexing (shipped)"
  - "Structural blame operation"
  - "code_find tool (shipped)"
acceptance_criteria:
  - "git graft enhance wraps git commands with structural annotations"
  - "Supports log, diff, show, blame, shortlog subcommands"
  - "Output format supports human and JSON modes"
---

# git graft enhance — structural annotations for git commands

Wrap any git command with structural annotations from graft's
parser and WARP worldlines. Git sees bytes. Graft sees meaning.
The enhance command bridges them.

This is the human-facing surface that justifies graft beyond the
agent use case. Humans already know git commands. Graft makes
them smarter.

## Every git command, enhanced

### `git graft enhance log HEAD~5..HEAD`
Structural summary per commit instead of just messages:
```
abc123 — added class Router, changed evaluatePolicy signature
def456 — docs only (no structural changes)
```

### `git graft enhance diff HEAD~1`
Structural annotations alongside line hunks:
```
src/server.ts: +2 functions, ~1 signature, =5 unchanged
```
(graft_diff summary lines already do this)

### `git graft enhance show abc123`
Structural annotation for a single commit:
```
Touches: src/policy/evaluate.ts
  changed evaluatePolicy (added budgetRemaining param)
  added BUDGET_CAP reason code
```

### `git graft enhance blame src/foo.ts`
Structural blame — which commit last changed each SYMBOL:
```
evaluatePolicy — last changed in abc123 (added param)
STATIC_THRESHOLDS — unchanged since def456
```

### `git graft enhance shortlog`
Structural churn per author:
```
James: 45 symbols added, 12 changed, 3 removed (10 commits)
```

### `git graft enhance stash`
Structural diff of stashed changes:
```
Stash@{0}: +1 function (handleTimeout), ~1 signature (processRequest)
```

### `git graft enhance cherry-pick abc123`
Preview structural impact before picking:
```
This commit adds class ErrorHandler and changes 2 signatures
```

### `git graft enhance merge feature-branch`
Structural merge preview:
```
Feature branch: +5 symbols, ~3 signatures
Potential conflicts: both branches modified evaluatePolicy
```

### `git graft enhance branch -v`
Structural divergence per branch:
```
feature-auth: +12 symbols, ~3 signatures ahead of main
fix-typo: no structural changes (docs only)
```

### `git graft enhance tag -l`
Structural diff between tags:
```
v0.3.0 → v0.4.0: +35 symbols, -0 removed, ~0 changed
```

### `git graft enhance bisect`
Structural-aware bisect — narrow to commits that touched a
specific symbol. Skip commits with no structural changes to
the target:
```
Narrowing to commits that touched evaluatePolicy...
Skipping abc123 (no structural changes to target)
```

## Implementation layers

**Live (tree-sitter):** parse changed files at both revisions,
run extractOutline + diffOutlines. Works today. Slow for large
ranges.

**WARP-backed:** structural diffs are pre-indexed. The enhance
command becomes a thin formatter over worldline observer queries.
Instant for indexed ranges.

## Output format

`--format=human` (default): interleaved with git output.
`--format=json`: structured JSON for agent consumption.

Depends on: graft_diff (shipped), WARP Level 1 (shipped),
structural blame (backlog), code_find (cycle 0024).
