# Bounded graft_map overview mode

Real dogfooding feedback showed that `graft_map` is delightful at
leaf-directory scope and awkward at mid-sized directory scope.

Today, when a structural map response grows beyond the transport token
ceiling, the safety valve is a file-fallback path with instructions to
read the oversized JSON in chunks. That is good defensive engineering,
but it is the wrong operator primitive for a tool whose value prop is
"show me the shape of this directory tree in one call."

Observed failure mode:
- `graft_map({ path: "src/domain/services" })` on `git-warp`
- 83 `.js` files across 10 subdirectories, ~28k LOC
- response overflowed at ~142k characters and degraded into a fallback
  file path
- the operator had to manually call `graft_map` on each subdirectory to
  reconstruct the whole overview

Desired end state:
- `graft_map` preserves the one-call orientation use case even when the
  full recursive detail would overflow transport limits
- automatic recursion control downgrades deeper subdirectories to
  bounded summaries before hard overflow
- callers can optionally ask for bounded scope directly with knobs like
  `depth` and `summary`
- receipts make truncation / summary posture explicit instead of hiding
  it behind an oversized blob file

Likely shape:
- phase 1:
  - `depth` parameter for direct-child-only traversal
  - `summary` parameter for per-file or per-directory counts without
    full symbol signatures
  - explicit summary/truncation markers in the result
- phase 2:
  - automatic hybrid mode: emit inline detail for the highest-value
    leaves and summary records for the rest when near budget
- phase 3:
  - progressive paging / cursor only if the first two phases still do
    not preserve the operator workflow

Questions:
- should automatic summary mode trigger before token overflow based on
  estimated result size
- what is the minimum useful summary record:
  file count, LOC, symbol count, top-level kinds, maybe direct-child
  directory summaries
- should `depth` and `summary` be independent request knobs or one
  higher-level map mode
- how do we keep the response contract stable across MCP and CLI while
  still exposing degradation honestly

Related:
- `docs/method/backlog/bad-code/CLEAN_CODE_mcp-tool-map-collector-orchestration.md`
- `docs/method/backlog/cool-ideas/CORE_codebase-orientation-map.md`

Effort: M
