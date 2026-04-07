# Cycle 0034 — Cross-Surface Policy Parity Tests

**Hill:** The policy audit matrix is now executable. Cross-surface
tests prove that hard denials stay aligned across hooks and MCP, that
soft pressure stays honest on the surfaces that model it, and that
historical/git-backed reads do not reopen denied content.

## Why now

Cycles 0030 through 0033 fixed the main policy implementation gaps:
- `.graftignore` parity on MCP
- structural-tool enforcement
- explicit `run_capture` exception boundary

What remained was witness coverage. Without matrix tests, readiness
claims can drift again as new surfaces or code paths appear.

## Playback questions

1. Does the same denied file stay denied across Claude Read hooks and
   governed MCP surfaces, even though their response shapes differ?
2. Do hooks and MCP stay honest about soft pressure instead of pretending
   they have one shared output contract?
3. Do historical and git-backed reads keep the same denial posture as
   live reads?
4. If a future change breaks policy alignment, will a single test packet
   catch it quickly?

## Scope

In scope:
- executable witnesses for hard-denial parity
- executable witnesses for soft-pressure parity
- executable witnesses for historical/git-backed denial parity
- invariant/docs updates that point at the witness packet

Out of scope:
- new policy semantics
- CLI parity
- `run_capture`
- versioned JSON schemas

## Design

Parity here means **equivalent policy outcome inside each surface's
native contract**, not identical payload shapes.

The matrix should encode three classes:

### 1. Hard denials

For banned binaries, secrets, and `.graftignore` matches:
- PreToolUse hook hard-blocks with exit code `2`
- PostToolUse stays silent
- MCP bounded-read surfaces return explicit refusal
- precision and structural MCP surfaces deny or surface denial
  explicitly when the denied file is relevant to them

### 2. Soft pressure

Hooks and MCP do not share the same contract here.
- PostToolUse educates after an oversized native `Read`
- `safe_read` returns bounded projections (`OUTLINE`,
  `SESSION_CAP`, `BUDGET_CAP`)
- targeted surfaces are not forced into the same shape as coarse reads

### 3. Historical denial parity

Git-backed reads must not bypass live policy.
- historical `code_show` stays denied
- `graft_diff` / `graft_since` surface denied files in `refused`

## Witnesses

- hard-denial matrix for `BINARY`, `SECRET`, and `GRAFTIGNORE`
- `.graftignore` parity for precision and structural MCP tools
- oversized native `Read` produces PostToolUse feedback while
  `safe_read` returns `OUTLINE`
- session pressure produces `SESSION_CAP` on `safe_read`
- budget pressure produces `BUDGET_CAP` on `safe_read`
- historical `.graftignore` denial remains enforced on `code_show`,
  `graft_diff`, and `graft_since`
