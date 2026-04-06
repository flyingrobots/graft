# Cycle 0024 — Precision Tools

**Sponsor human:** Repository Operator
**Sponsor agent:** Implementation Agent

## Premise

`file_outline` shows you the shape of a file. `read_range` gives
you a slice. But there's no way to say "show me the function
called `evaluatePolicy`" or "find all classes that export a
`handle` method."

Agents spend context navigating to symbols they already know by
name. They read an outline, scan for the symbol, extract its line
range, then call `read_range`. That's three tool calls for what
should be one.

## Hill

An agent can focus on a symbol by name and get its source code in
one call. An agent can search for symbols across the project by
name or kind and get a list of matches with locations.

## Playback questions

### Agent perspective
- Can I get the source code of a function by name in one call?
  **Must be yes.**
- Can I search for all functions matching a pattern across the
  project? **Must be yes.**
- Do results include enough context to act (file path, line range,
  signature)? **Must be yes.**

### Operator perspective
- Do the tools respect existing policy (banned files, session
  depth, budget)? **Must be yes.**
- Are they fast enough for interactive use? **Must be yes.**

## Non-goals

- Cross-language search (JS/TS only for now)
- Semantic search (name/kind matching only, not meaning)
- Symbol identity across renames (Level 2 WARP)
- Dependency/call graph analysis

## Design

### `code_show(symbol, path?)`

Focus on a symbol by name. Returns its source code, signature,
and location.

1. If `path` is provided — parse that file, find the symbol,
   return its source via `read_range`
2. If `path` is omitted — search across the project using
   `graft_map` to find all matches, then return the first (or
   list if ambiguous)

Policy-gated: the file must pass `evaluatePolicy`. If the symbol
is in a banned file, return a refusal.

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
  "projection": "content"
}
```

### `code_find(query, kind?, path?)`

Search for symbols matching a name pattern. Returns a list of
matches with locations but NOT source code (use `code_show` for
that).

- `query` — glob or substring match against symbol names
- `kind` — optional filter: function, class, method, interface, etc.
- `path` — optional directory scope

Uses `graft_map` internally to enumerate symbols, then filters.

Response shape:
```json
{
  "query": "handle*",
  "matches": [
    { "name": "handleRequest", "kind": "function", "path": "src/server.ts", "startLine": 42, "endLine": 80 },
    { "name": "handleError", "kind": "function", "path": "src/errors.ts", "startLine": 10, "endLine": 25 }
  ],
  "total": 2
}
```

### Implementation

Both tools build on existing infrastructure:
- `extractOutline` + `jumpTable` for symbol discovery
- `read_range` for source code extraction
- `graft_map` for project-wide symbol enumeration
- `evaluatePolicy` for policy enforcement (via policyCheck flag)

No WARP dependency required — these parse the working tree
directly like `graft_map` does.

## Deliverables

1. `code_show` MCP tool
2. `code_find` MCP tool
3. Tests for both
4. GUIDE updated with new tools

## Effort

M — both tools build on existing infrastructure.

## Accessibility / assistive reading posture

All output is structured JSON.

## Localization / directionality posture

Not applicable.

## Agent inspectability / explainability posture

Every response includes the symbol's file path, line range, and
kind. Search results include match count. Policy refusals explain
why and suggest alternatives.
