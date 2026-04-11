# Cycle 0045 — Precision search typed seams

Type: Debt
Legend: CLEAN

## Sponsors

- Human: repo operator
- Agent: Codex

## Hill

The precision/search slice no longer relies on loose request bags and
ad hoc structural result shaping in the hot path. `code_find`,
`graft_map`, and git file enumeration should run through smaller,
runtime-backed seams that make the next release work safer to extend.

## Playback questions

### Human

1. Can we add the next search/refactor feature without layering more
   behavior onto a giant helper blob?
2. Do `code_find` and `graft_map` still behave the same from the
   operator point of view after the refactor?

### Agent

1. Are precision search requests and matches now explicit runtime-backed
   models instead of loose structural objects?
2. Is git file enumeration a clearer typed seam instead of an
   environment-heavy helper?
3. Has `precision.ts` shed matching and request-shaping concerns into
   smaller units?

## Scope

- introduce runtime-backed request/result models for the precision slice
- give `code_find` and `graft_map` explicit request models
- give git file enumeration a typed query/result seam
- move precision query matching and result modeling out of the shared
  helper blob
- keep tool behavior stable while paying down the seam

Attached debt in this cycle:

- `docs/method/backlog/bad-code/CLEAN_CODE_mcp-tool-code-find.md`
- `docs/method/backlog/bad-code/CLEAN_CODE_mcp-tool-git-files.md`
- `docs/method/backlog/bad-code/CLEAN_CODE_mcp-tool-map.md`

## Non-goals

- broad MCP server or context refactors
- repo-state tracker surgery
- new product-visible search features

## Success Criteria

- `code_find` uses a runtime-backed request model
- `graft_map` uses a runtime-backed request model
- precision matches are no longer plain structural objects
- git file enumeration has a typed query/result seam
- existing `code_find` and `graft_map` witnesses still pass
