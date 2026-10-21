---
title: "Indexing never records the removal of a deleted file's symbols"
feature: warp
kind: bad-code
legend: WARP
lane: bad-code
priority: 2
effort: S
status: open
reported: 2026-10-20
---

# Indexing never records the removal of a deleted file's symbols

## Problem

`indexHead` selects only paths tracked at HEAD (`selectParseableFiles` in
`src/warp/index-head.ts`). A removal is recorded only when a file is
re-indexed and a symbol it held before is gone. A deleted file is never
re-indexed, so its `sym:` nodes stay live and no `removes` edge is written.
Dead-symbol detection, which diffs live symbol sets, never reports them.

Since the dead-symbol coverage work, the reading reports such a file as
missing coverage (`deleted-since-indexed`) and says `partial`. So the answer is
honest, but it stays partial until the index learns about the deletion.

## Direction

When indexing a commit, reconcile `file:` nodes stamped with an
`indexedCommit` whose path is no longer tracked: write `removes` edges for
their symbols and remove the nodes, inside the same per-file patch budget.
Then the coverage report stops listing them.
