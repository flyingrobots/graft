# Legend: WARP

Structural memory over Git. The domain where graft grows from a
context governor into a provenance-aware substrate.

## What it covers

Git tracks bytes. WARP tracks what those bytes mean structurally.
Graft is the edge — the governor and observer. WARP is the memory
underneath.

## Core model

**Worldline** — mirrors the git commit timeline, but richer. One
tick per commit, PLUS ticks for every intermediate working-copy
change (unstaged edits between commits). Git sees snapshots at
commits. WARP sees the full structural evolution.

**WARP graph** — models the project-wide AST. Files, classes,
functions, interfaces, exports, and their relationships. This is
the materialized state at any point on the worldline.

**Tick patches** — each tick stores a structural delta, not the
full AST. Patches are AST operations: add symbol, remove symbol,
change signature, move method. Materializing at any point means
walking the worldline and applying patches from a checkpoint.

```
commit A → edit foo.ts → edit bar.ts → edit foo.ts → commit B
   tick 0     tick 1       tick 2        tick 3       tick 4
   [patch]    [patch]      [patch]       [patch]      [patch]
```

Git knows about tick 0 and tick 4. WARP knows about all of them.

## Levels

### Level 1: Commit-level worldline

One tick per commit. Post-commit hook parses changed files with
tree-sitter, diffs against the previous materialized AST, writes
the structural patch to the worldline.

Enables:
- `graft since <ref>` — structural delta between two commits
- `graft history <symbol>` — how a function/class evolved
- Time-travel queries without checking out old commits

### Level 2: Observation cache

Record every `safe_read` as an observation on the worldline. Track
what the agent saw and when.

Enables:
- `changed-since-last-read` — what changed since the agent's last
  observation of a file
- Re-read detection — "you already read this, nothing changed"
- Session-aware context: the governor knows what the agent has seen

### Level 3: Sub-commit causal tracking

Every working-copy edit (agent or human) is a tick on the worldline.
The causal chain of reads and writes IS the reasoning trace.

Agent writes captured via Edit tool hooks. Human writes captured
via filesystem watcher or accepted as gaps.

Enables:
- "What did the agent see before it made this edit?"
- Automated witness — structural provenance of every change
- Walk backward from a test failure through the chain of
  structural operations that led to it
- No unstaged state — every edit is a structural observation

## Who cares

- **Agents**: structural deltas instead of line diffs, re-read
  avoidance, reasoning traces, causal provenance
- **James**: provenance of agent work, debugging agent mistakes,
  understanding context pressure patterns, richer Git history

## What success looks like

An agent can ask "what changed structurally since I last looked?"
and get a meaningful answer without re-reading the file, without
checking out old commits, and without line-diff noise. And when
something goes wrong, the full causal chain of structural changes
is available to walk backward through.

## How you know

Blacklight-measurable: re-read frequency drops, context burden drops
further, edit quality improves (fewer fix-the-fix cycles).

## Dependencies

- `@AverageHelper/git-warp` (published, stable v16)
- Tree-sitter parser (already in graft)
- Git hooks (post-commit for Level 1)
- Edit tool hooks (Level 3)
- Filesystem watcher (Level 3, optional, for human edits)
