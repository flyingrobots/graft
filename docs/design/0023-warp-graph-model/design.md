# Cycle 0023 — WARP Graph Model

**Sponsor human:** Repository Operator
**Sponsor agent:** Implementation Agent

**Hill:** An agent working on a codebase can ask "what changed
structurally since commit X?" and get a precise answer — added
functions, removed classes, changed signatures — without reading
any files or parsing any diffs.

## Playback questions

### Agent perspective
- Can an agent query structural changes between two commits without
  reading files? **Must be yes.**
- Does the graph model represent the structural elements the agent
  actually cares about (functions, classes, exports, signatures)?
  **Must be yes.**
- Can the agent get a structural history of a single symbol across
  commits? **Must be yes.**

### Operator perspective
- Is the graph model documented well enough that a new contributor
  can understand the node/edge schema? **Must be yes.**
- Does the model degrade gracefully for unsupported languages (files
  with no tree-sitter parser)? **Must be yes.**
- Is the storage overhead acceptable (< 1% of repo size for typical
  JS/TS projects)? **Should be yes.**

## Non-goals

- Sub-commit tracking (Level 3 — future cycle)
- Symbol identity across renames (Level 2+ — name-based for now)
- Language support beyond JS/TS (Rust later)
- Real-time filesystem watching
- Modifying git-warp itself

## Design

### The Big Picture

```
Git commit history          WARP graph (structural memory)
─────────────────          ─────────────────────────────
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

Each git commit produces a WARP tick. The tick contains a structural
delta patch — not the full AST, just what changed. Materializing at
any tick gives the full structural state of the project at that
commit.

### Graph Schema

#### Node types

| Node ID pattern | Kind | Properties |
|----------------|------|------------|
| `file:<path>` | File | `path`, `lang` |
| `sym:<path>:<name>` | Symbol | `name`, `kind`, `signature`, `exported`, `startLine`, `endLine` |
| `commit:<sha>` | Commit | `sha`, `message`, `timestamp` |

**Symbol kinds** (from tree-sitter outline): `function`, `class`,
`method`, `interface`, `type`, `enum`, `export`, `variable`.

#### Edge types

| Edge | From | To | Meaning |
|------|------|----|---------|
| `contains` | file | symbol | File contains this symbol |
| `child_of` | symbol | symbol | Nested symbol (method in class) |
| `at_commit` | file | commit | File state at this commit |

#### Property conventions

- `name` — symbol name (string)
- `kind` — symbol kind enum (string)
- `signature` — full signature string (nullable)
- `exported` — is the symbol exported? (boolean)
- `startLine`, `endLine` — source location (number)
- `path` — file path relative to repo root (string)
- `lang` — detected language (string, nullable)
- `sha` — commit SHA (string)
- `message` — commit message (string)
- `timestamp` — commit timestamp ISO 8601 (string)

### Tick Lifecycle

When a commit is indexed:

1. **Identify changed files** — `git diff --name-status <prev> <curr>`
2. **For each changed file:**
   - Parse the file at the new commit with tree-sitter (`extractOutline`)
   - Parse the file at the previous commit (if modified, not added)
   - Compute structural diff (`diffOutlines`)
3. **Emit WARP patch operations:**
   - Added files → `addNode(file:...)` + `addNode(sym:...)` for
     each symbol + `addEdge(contains)` + `addEdge(child_of)` for
     nested symbols
   - Deleted files → tombstone file node + all its symbol nodes
   - Modified files → tombstone removed symbols, add new symbols,
     update changed symbol properties (signature, line range)
4. **Record commit node** — `addNode(commit:<sha>)` with metadata
5. **Link files to commit** — `addEdge(at_commit)` for changed files

### The Cardinal Rule: Observers, Not Manual Traversal

**DO NOT** manage the graph. **DO NOT** implement traversal
algorithms. **DO NOT** maintain redundant state about what the
graph contains.

Graft does exactly two things with WARP:
1. **Write patches** — structural deltas per commit (the indexer)
2. **Read through Observers** — focused projections for each query

The graph manages itself. Graft writes facts and asks questions
through the right lens.

An Observer is NOT a filter. It is a **projection functor** with
three layers (from AION Observer Geometry):
1. **Projection** — what the observer sees at all
2. **Basis** — what's natively expressible in the observer's
   coordinate system
3. **Accumulation** — how the observer builds understanding over
   time from successive observations

### Observer Patterns for Graft Tools

Each graft tool creates an Observer with a Lens tuned to its
query:

```typescript
// "What symbols exist in src/foo.ts?"
const obs = await worldline.observer({
  match: 'sym:src/foo.ts:*',
  expose: ['name', 'kind', 'signature', 'exported']
});
const symbols = await obs.getNodes();

// "What files exist in the project?"
const obs = await worldline.observer({
  match: 'file:*',
  expose: ['path', 'lang']
});

// "What changed between commit A and commit B?"
// Two observers at different worldline positions, compared
const wlA = await warp.worldline({ source: { kind: 'coordinate', ... }});
const wlB = await warp.worldline({ source: { kind: 'coordinate', ... }});
const obsA = await wlA.observer({ match: 'sym:*' });
const obsB = await wlB.observer({ match: 'sym:*' });
// Compare the two projected views

// "Show me symbols in this one file only"
const obs = await worldline.observer({
  match: 'sym:src/server.ts:*',
  expose: ['name', 'kind', 'signature', 'startLine', 'endLine']
});
```

The node ID naming scheme determines the **aperture boundary** —
it controls what each observer can focus on. This is why the
`sym:<path>:<name>` pattern matters: it enables file-scoped,
symbol-scoped, and project-wide observers through glob matching.

### Integration with Existing Graft

| Existing tool | WARP enhancement | Observer lens |
|--------------|-----------------|---------------|
| `graft_diff` | Reads from pre-indexed graph for committed refs | `match: 'sym:*'` at two worldline positions |
| `changed_since` | Symbol-level change detection | `match: 'sym:<path>:*'` comparison |
| `safe_read` | Cache warmth — skip re-parse if graph knows no structural change | `match: 'file:<path>'` property check |
| `file_outline` | Read outline from graph instead of parsing | `match: 'sym:<path>:*'`, expose signatures |

### New tools (future cycles)

| Tool | Observer pattern |
|------|-----------------|
| `graft_since` | Compare observers at two worldline positions (two refs) |
| `symbol_history` | Provenance-retaining observer with accumulation over ticks |
| `code_show` | Single-symbol observer: `match: 'sym:*:<name>'` |

### git-warp Integration

**Graph name:** `graft-ast`
**Writer ID:** `graft` (single writer for now — no multi-agent)
**Persistence:** `GitGraphAdapter` backed by the repo's own `.git`

WARP data lives under `refs/warp/graft-ast/` in the repo's git
directory. No extra files in the working tree.

**Indexing trigger:** either:
- Post-commit hook (real-time, per-commit)
- Lazy indexing on first query (backfill on demand)
- CLI command: `graft index` (manual)

For Level 1, **lazy indexing** is the pragmatic choice — no hooks
to install, works with existing repos, backfills on first structural
query.

### Connection to graft's existing observation model

Graft's observation cache (Level 2, shipped) is already an
**accumulator** in the Observer Geometry sense. Each `safe_read`
records an observation. The cache hit emission returns a structural
description based on accumulated observations. WARP Level 1 extends
this from single-session memory to cross-commit structural memory.

The agent's view through graft tools IS an observer projection.
WARP makes the underlying graph explicit and queryable.

### Graceful degradation

Files without a tree-sitter parser (markdown, YAML, images, etc.)
get a file node but no symbol nodes. The graph records their
existence and change status, but not their structure. This matches
graft's existing behavior — `extractOutline` returns empty for
unsupported languages.

### Storage model

WARP patches are CBOR-encoded git objects under `refs/warp/`. For
a typical JS/TS project:

- ~5-20 symbols per file
- ~50-500 files
- Each tick patches only changed files
- Expected: < 1 KB per commit tick for typical changes

Storage overhead is proportional to structural churn, not repo
size. A 10,000-commit repo with ~10 changed files per commit would
produce ~100 KB of WARP data.

## Deliverables

1. **Graph schema doc** — node types, edge types, property
   conventions, observer patterns (this document)
2. **Indexer** — walks git history, parses files at each commit,
   emits WARP patches via PatchBuilder (`src/warp/indexer.ts`)
3. **Observer factory** — creates properly-lensed observers for
   each graft query pattern (`src/warp/observers.ts`)
4. **`graft_since` tool** — MCP tool using observer comparison
   to return structural delta between two refs
5. **Tests** — indexer patch tests, observer projection tests,
   integration tests against real git history

## Effort

L — multiple sessions. The graph schema and indexer are the core
work. Query layer and MCP tool are straightforward once the
foundation is solid.

## Accessibility / assistive reading posture

All output is structured JSON. No visual-only representations.
Symbol names, kinds, and signatures are plain text strings.

## Localization / directionality posture

Not applicable — structural data is language-neutral at the schema
level. Symbol names come from source code as-is.

## Agent inspectability / explainability posture

Every structural delta is a list of concrete operations (add
symbol, remove symbol, change property). The agent can inspect
exactly what changed and why. Commit metadata links structural
changes to their git context.
