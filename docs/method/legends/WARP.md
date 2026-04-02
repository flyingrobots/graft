# Legend: WARP

Structural memory over Git. The domain where graft grows from a
context governor into a provenance-aware substrate.

## What it covers

Git tracks bytes. WARP tracks what those bytes mean structurally,
indexed by commit. Graft is the edge — the governor and observer.
WARP is the memory underneath.

## Levels

### Level 1: AST per commit (branch worldlines)

One WARP worldline per branch. Each node is a commit. Node data is
the parsed AST (tree-sitter) of changed files at that commit.

Enables:
- `graft since <ref>` — structural delta between two commits
- `graft history <symbol>` — how a function/class evolved
- Time-travel queries without checking out old commits

### Level 2: Observation cache (agent reads)

Record every `safe_read` as an observation on the branch worldline.
Track what the agent saw and when.

Enables:
- `changed-since-last-read` — what changed since the agent's last
  observation of a file
- Re-read detection — "you already read this, nothing changed"
- Session-aware context: the governor knows what the agent has seen

### Level 3: Causal write tracking

If the agent's writes go through graft, every edit becomes a
structural observation. The causal chain of reads and writes IS
the reasoning trace.

Enables:
- "What did the agent see before it made this edit?"
- Automated witness — the structural provenance of every change
- Sub-commit granularity (like jj: no unstaged state, every
  working-copy change is tracked causally)
- Walk backward from a test failure to the read that informed
  the edit that caused it

## Who cares

- **Agents**: structural deltas instead of line diffs, re-read
  avoidance, reasoning traces
- **James**: provenance of agent work, debugging agent mistakes,
  understanding context pressure patterns

## What success looks like

An agent can ask "what changed structurally since I last looked?"
and get a meaningful answer without re-reading the file, without
checking out old commits, and without line-diff noise.

## How you know

Blacklight-measurable: re-read frequency drops, context burden drops
further, edit quality improves (fewer fix-the-fix cycles).

## Dependencies

- `@AverageHelper/git-warp` (published, stable v16)
- Tree-sitter parser (already in graft)
- Git hooks (post-commit for Level 1)
- Write interception (Level 3, future)
