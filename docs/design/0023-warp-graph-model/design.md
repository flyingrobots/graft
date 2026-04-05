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

### Materialization = Structural State at Any Commit

```typescript
// "What does the codebase look like structurally at commit X?"
const worldline = await warp.worldline();
const state = await worldline.materialize();
// → all file nodes, all symbol nodes, all edges
// → the full structural map of the project
```

### Structural Queries (what this enables)

```
// "What changed between commit A and commit B?"
compareVisibleStateV5(stateAtA, stateAtB)
→ nodes added/removed, properties changed
→ "function farewell was added, function greet's signature changed"

// "Show me the history of function greet"
// Walk ticks, filter for patches touching sym:src/foo.ts:greet

// "What files have structural changes in this PR?"
// Materialize at PR base and PR head, compare
```

### Integration with Existing Graft

| Existing tool | WARP enhancement |
|--------------|-----------------|
| `graft_diff` | Currently parses files live. With WARP, reads from pre-indexed graph for committed refs. |
| `changed_since` | Currently file-level. With WARP, symbol-level change detection. |
| `safe_read` | Cache warmth from WARP — if the graph knows a file hasn't changed structurally, skip re-parse. |
| `file_outline` | For committed files, read outline from graph instead of parsing. |

### New tools (future cycles)

| Tool | Purpose |
|------|---------|
| `graft_since` | Structural delta between two refs from WARP graph |
| `symbol_history` | How a symbol evolved across commits |
| `code_show` | Focus on a symbol by name (from graph, not parsing) |

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
   conventions (this document)
2. **Indexer** — walks git history, parses files, emits WARP
   patches (`src/warp/indexer.ts`)
3. **Query layer** — materializes state at any commit, compares
   two commits structurally (`src/warp/query.ts`)
4. **`graft_since` tool** — MCP tool that returns structural
   delta between two refs
5. **Tests** — indexer tests, query tests, integration tests

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
