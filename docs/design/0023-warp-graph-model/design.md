# Cycle 0023 — WARP Graph Model

**Sponsor human:** Repository Operator
**Sponsor agent:** Implementation Agent

## Premise

Git remembers bytes. It does not remember structure.

A repository can tell you which files changed between two commits,
but not which functions were added, which class signatures shifted,
or how a symbol's meaning evolved across history — without
re-reading files and recomputing structure from scratch.

Graft should not have to rediscover structure every time it is
asked a question. Structural knowledge should persist.

This cycle introduces a Level 1 structural memory model for Graft
using git-warp. Each commit becomes a WARP tick. Each tick records
structural delta, not raw text. The result is a repository-local
worldline of structural facts that can be queried through observers.

The immediate payoff is practical: an agent can ask "what changed
structurally since commit X?" and get a precise answer without
reading files or parsing diffs.

The deeper payoff is architectural: Graft stops being only a
context governor and becomes a provenance-aware substrate for
structural memory.

## Hill

Structural memory exists as a first-class substrate in the
repository.

An agent can ask for structural change, structure at a point in
history, or history of a symbol, and receive those answers through
observer projections over a WARP-backed worldline — not by
re-reading files or traversing ad hoc indexes.

## The Observer Law

```
┌─────────────────────────────────────┐
│  1. Write facts.                    │
│  2. Read projections.               │
│  3. Never traverse by hand.         │
└─────────────────────────────────────┘
```

Graft does not manage the graph.

It does not maintain hand-written traversal logic. It does not
keep redundant summaries of graph state. It does not grow a
parallel query layer beside WARP.

Graft performs exactly two classes of operation:

1. **Write structural facts as patches**
2. **Read structural projections through observers**

Everything else is accidental complexity.

The graph is not a bag of nodes to be manually walked. It is a
substrate over which observers establish lawful partial views.

This is not an optimization preference. It is an architectural
rule. If a feature requires hand-managed traversal, hidden summary
state, or custom graph bookkeeping, the design is drifting and
should be corrected.

## Playback questions

### Agent perspective
- Can an agent query structural changes between two commits
  without reading files? **Must be yes.**
- Does the model represent the structural elements the agent
  cares about (functions, classes, exports, signatures)?
  **Must be yes.**
- Can the agent get a structural history of a single symbol
  across commits? **Must be yes.**

### Operator perspective
- Is the model documented well enough that a new contributor
  can understand it? **Must be yes.**
- Does it degrade gracefully for unsupported languages?
  **Must be yes.**
- Is storage overhead proportional to structural churn, not
  raw byte volume? **Should be yes.**

## Non-goals

- Sub-commit tracking (Level 3 — future cycle)
- Symbol identity across renames (Level 2 — see identity model)
- Language support beyond JS/TS (Rust later)
- Real-time filesystem watching
- Modifying git-warp itself

## The Big Picture

```
Git commit history          WARP worldline (structural memory)
─────────────────          ────────────────────────────────────
commit A ─────────────────► tick 0: structural snapshot
     │                          file:src/foo.ts
     │                            ├── fn:greet (exported)
     │                            └── const:VERSION (exported)
     │
commit B ─────────────────► tick 1: structural delta patch
     │                          file:src/foo.ts
     │                            + fn:farewell (exported)
     │                            ~ fn:greet (signature changed)
     │
commit C ─────────────────► tick 2: structural delta patch
                                file:src/bar.ts (new file)
                                  + class:Router (exported)
                                    + method:handle
                                    + method:use
```

Materialization at any tick yields the structural state of the
repository at that commit. Structural queries then become observer
projections over this worldline, not fresh parsing work.

A tick is the structural boundary corresponding to a commit: the
point at which structural state may lawfully differ from the prior
worldline position.

Each symbol can be understood as tracing a strand through commit
history. Level 1 addresses that strand by name/path, while later
levels recover deeper continuity across rename and refactor events.

## Observer Patterns

Each graft tool creates an Observer with a Lens tuned to its query.
The node ID naming scheme determines the **aperture boundary** —
it controls what each observer can focus on.

```typescript
// "What symbols exist in src/foo.ts?"
const obs = await worldline.observer({
  match: 'sym:src/foo.ts:*',
  expose: ['name', 'kind', 'signature', 'exported']
});

// "What changed between commit A and commit B?"
const obsA = await wlA.observer({ match: 'sym:*' });
const obsB = await wlB.observer({ match: 'sym:*' });
// Compare the two projected views

// "Focus on one symbol across the project"
const obs = await worldline.observer({
  match: 'sym:*:greet'
});
```

### Integration with existing Graft tools

| Tool | WARP enhancement | Observer lens |
|------|-----------------|---------------|
| `graft_diff` | Pre-indexed structural diffs for committed refs | `match: 'sym:*'` at two worldline positions |
| `changed_since` | Symbol-level change detection | `match: 'sym:<path>:*'` comparison |
| `safe_read` | Skip re-parse if graph knows no structural change | `match: 'file:<path>'` property check |
| `file_outline` | Read outline from graph instead of parsing | `match: 'sym:<path>:*'`, expose signatures |

### New tools (future cycles)

| Tool | Observer pattern |
|------|-----------------|
| `graft_since` | Compare observers at two worldline positions |
| `symbol_history` | Provenance-retaining observer with accumulation |
| `code_show` | Single-symbol observer: `match: 'sym:*:<name>'` |

## Tick Lifecycle

When a commit is indexed:

1. **Identify changed files** — `git diff --name-status <prev> <curr>`
2. **For each changed file:**
   - Parse the file at the new commit with tree-sitter
   - Parse the file at the previous commit (if modified)
   - Compute structural diff (`diffOutlines`)
3. **Emit WARP patch operations:**
   - Added files → `addNode(file:...)` + symbol nodes + edges
   - Deleted files → tombstone file node + all its symbol nodes
   - Modified files → tombstone removed symbols, add new symbols,
     update changed symbol properties
4. **Record commit node** — `addNode(commit:<sha>)` with metadata
5. **Link files to commit** — `addEdge(at_commit)` for changed files

## Graph Schema (implementation surface)

The schema exists to support observer projections over structural
history. It is not the public abstraction of the system. It is the
storage shape that makes the projection model efficient and lawful.

### Node types

| Node ID pattern | Kind | Properties |
|----------------|------|------------|
| `file:<path>` | File | `path`, `lang` |
| `sym:<path>:<name>` | Symbol | `name`, `kind`, `signature`, `exported`, `startLine`, `endLine` |
| `commit:<sha>` | Commit | `sha`, `message`, `timestamp` |

**Symbol kinds:** `function`, `class`, `method`, `interface`,
`type`, `enum`, `export`, `variable`.

### Edge types

| Edge | From | To | Meaning |
|------|------|----|---------|
| `contains` | file | symbol | File contains this symbol |
| `child_of` | symbol | symbol | Nested symbol (method in class) |
| `at_commit` | file | commit | File state at this commit |

## Identity Model

Level 1 uses **observer-addressable** symbol identity:

- `sym:<path>:<name>` provides a practical query surface
- It supports file-scoped, project-wide, and symbol-name queries
- It is sufficient for structural deltas where names are stable

This is not full semantic identity.

A rename currently appears as one removal and one addition. That
limitation is accepted at Level 1. It keeps the model simple,
cheap, and honest.

Full identity across renames, moves, and structural refactors
belongs to Level 2+, where identity is derived from continuity of
structure and provenance — not just current name/path
addressability. This is not a bug in the model. It is the boundary
between Level 1 and Level 2 semantics.

## Connection to Graft's Observation Model

Graft's observation cache (Level 2, shipped) is already an
**accumulator** in the Observer Geometry sense. Each `safe_read`
records an observation. The cache hit emission returns a structural
description based on accumulated observations.

WARP Level 1 extends this from single-session memory to
cross-commit structural memory. The agent's view through graft
tools IS an observer projection. WARP makes the underlying
worldline explicit and queryable.

## git-warp Integration

**Graph name:** `graft-ast`
**Writer ID:** `graft` (single writer — no multi-agent)
**Persistence:** `GitGraphAdapter` backed by the repo's `.git`

WARP data lives under `refs/warp/graft-ast/` in the git directory.
No extra files in the working tree.

**Indexing:** lazy — backfills on first structural query. No hooks
to install, works with existing repos. A `graft index` CLI command
provides manual control.

## Graceful Degradation

Files without a tree-sitter parser (markdown, YAML, images, etc.)
get a file node but no symbol nodes. The graph records their
existence and change status, but not their structure.

## Storage Model

WARP storage cost is driven by structural churn, not repository
byte size.

The system stores structural delta patches: changed files, not
unchanged files. Changed symbols, not full ASTs. Semantic shape,
not raw source text.

For typical JS/TS repositories this should remain small, because
most commits touch only a few files and only a subset involve
meaningful structural change.

The important property is not just "small" but: **proportional to
structural entropy, not textual bulk.**

## Deliverables

1. **Graph schema and observer model** (this document)
2. **Commit indexer** emitting WARP patches via PatchBuilder
3. **Observer factory** for canonical Graft query patterns
4. **`graft_since`** as first WARP-backed public query
5. **Tests** proving patch correctness and projection correctness

## Effort

L — multiple sessions.

## Accessibility / assistive reading posture

All output is structured JSON. No visual-only representations.

## Localization / directionality posture

Not applicable — structural data is language-neutral at the schema
level.

## Agent inspectability / explainability posture

Every structural delta is a list of concrete operations. The agent
can inspect exactly what changed and why. Commit metadata links
structural changes to their git context.
