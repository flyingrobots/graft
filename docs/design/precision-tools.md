---
title: "Cycle 0024 — Precision Tools"
---

# Cycle 0024 — Precision Tools

**Sponsor human:** Repository Operator
**Sponsor agent:** Implementation Agent

## Premise

`file_outline` shows you the shape of a file. `read_range` gives
you a slice. But there's no way to say "show me the function called
`evaluatePolicy`" or "find all classes that export a `handle`
method."

Agents spend context navigating to symbols they already know by
name. They read an outline, scan for the symbol, extract its line
range, then call `read_range`. That's three tool calls for what
should be one.

The WARP graph already stores every symbol with its name, kind,
signature, and line range. The precision tools are the first real
READ consumers of this graph — the projection-before-parse
invariant coming to life.

## Hill

An agent can focus on a symbol by name and get its source code in
one call. An agent can search for symbols across the project by
name or kind. Both read from the WARP graph when indexed, falling
back to live parsing when not.

## Playback questions

### Agent perspective
- Can I get the source code of a function by name in one call?
  **Must be yes.**
- Can I search for symbols matching a pattern across the project?
  **Must be yes.**
- Can I see where a symbol lived at a previous commit?
  **Should be yes.**
- Do results include enough context to act (file path, line range,
  signature)? **Must be yes.**

### Operator perspective
- Do the tools respect existing policy (banned files, session
  depth, budget)? **Must be yes.**
- Do they prefer WARP graph reads over reparsing when available?
  **Must be yes** (projection-before-parse invariant).
- Are they fast enough for interactive use? **Must be yes.**

## Non-goals

- Cross-language search (JS/TS only for now)
- Semantic search (name/kind matching only, not meaning)
- Symbol identity across renames (Level 2 WARP)
- Dependency/call graph analysis

## Design

### `code_show(symbol, path?, ref?)`

Focus on a symbol by name. Returns its source code, signature,
and location.

**Read path:**
1. If the WARP graph is indexed for the target ref — observe
   `sym:*:<name>` through the graph. Get file path + line range
   from the observer. Then `read_range` for the source.
2. If not indexed or targeting working tree — parse live via
   `extractOutline` + `jumpTable`, then `read_range`.

The `ref` parameter enables structural time travel: "show me
`evaluatePolicy` as it looked at v0.3.0." The observer pins to
that commit's tick via ceiling.

**Policy:** the file must pass `evaluatePolicy`. If the symbol is
in a banned file, return a refusal.

**Ambiguity:** if multiple symbols match (e.g., `handle` exists in
3 files), return all matches with their locations and let the agent
pick. Don't silently return the first.

Response shape:
```json
{
  "symbol": "evaluatePolicy",
  "kind": "function",
  "signature": "evaluatePolicy(input: PolicyInput, options?: PolicyOptions): PolicyResult",
  "path": "src/policy/evaluate.ts",
  "startLine": 96,
  "endLine": 163,
  "content": "export function evaluatePolicy(...) { ... }",
  "source": "warp"
}
```

When ambiguous:
```json
{
  "symbol": "handle",
  "ambiguous": true,
  "matches": [
    { "path": "src/server.ts", "kind": "method", "startLine": 42, "endLine": 80 },
    { "path": "src/router.ts", "kind": "function", "startLine": 10, "endLine": 25 }
  ]
}
```

### `code_find(query, kind?, path?)`

Search for symbols matching a name pattern. Returns matches with
locations but NOT source code (use `code_show` for that).

- `query` — glob pattern against symbol names (e.g., `handle*`,
  `*Policy`, `evaluate*`)
- `kind` — optional filter: function, class, method, interface
- `path` — optional directory scope (e.g., `src/mcp`)

**Read path:** same as `code_show` — WARP observer when indexed,
live `graft_map` when not.

Response shape:
```json
{
  "query": "handle*",
  "matches": [
    { "name": "handleRequest", "kind": "function", "path": "src/server.ts", "startLine": 42, "endLine": 80, "signature": "..." },
    { "name": "handleError", "kind": "function", "path": "src/errors.ts", "startLine": 10, "endLine": 25, "signature": "..." }
  ],
  "total": 2,
  "source": "warp"
}
```

### WARP integration

Both tools use the observer factory:
- `symbolByNameLens(name)` — find a symbol across all files
- `fileSymbolsLens(path)` — all symbols in a specific file
- `allSymbolsLens()` — project-wide search for `code_find`

When the WARP graph is indexed, these observers give instant
results from the graph. No parsing. No file reads for the search
phase. The only file read is `read_range` for the actual source
code in `code_show`.

When WARP is not indexed, the tools fall back to `graft_map` /
`extractOutline` — live parsing from the working tree. Same results,
slower path. The agent doesn't need to know which path was used,
but the `source` field in the response tells them.

### Structural time travel

`code_show(symbol, ref: "v0.3.0")` pins the observer to that
commit's tick via ceiling. The agent sees where the symbol lived,
what its signature was, and can read its source at that point in
history. This is structural git blame — not "who touched line 42"
but "where did this function live and what did it look like."

## Deliverables

1. `code_show` MCP tool with WARP + fallback paths
2. `code_find` MCP tool with WARP + fallback paths
3. Tests for both (WARP-backed and fallback)
4. GUIDE + README updated

## Effort

L — WARP integration adds complexity beyond simple parsing.

## Accessibility / assistive reading posture

All output is structured JSON.

## Localization / directionality posture

Not applicable.

## Agent inspectability / explainability posture

Every response includes `source` ("warp" or "live") so the agent
knows whether it hit the indexed graph or parsed live. Policy
refusals include reason codes and alternatives.
