# Cycle 0044 — code_find substring search

Type: Feature
Legend: CORE

## Sponsors

- Human: repo operator
- Agent: Codex

## Hill

When someone knows an approximate symbol name but not the exact casing
or full identifier, `code_find` should return useful matches without
requiring manual `*` glob syntax.

## Playback questions

### Human

1. Does `code_find({ query: "adapter" })` find symbols such as
   `GitWarpAdapter` without forcing the operator to guess `*adapter*`?
2. Do tighter matches still come first so the results stay usable
   instead of turning into an opaque fuzzy list?

### Agent

1. Is the default matching rule deterministic and explainable from the
   implementation and tests?
2. Does the behavior stay aligned across live parsing and WARP-backed
   clean-head search?

## Scope

- plain-text `code_find` queries become case-insensitive approximate
  discovery
- explicit glob queries keep the existing glob semantics
- ordering favors exact matches, then prefixes, then substrings
- add witnesses for both live parsing and WARP-backed clean-head search

## Non-goals

- edit-distance or opaque fuzzy ranking
- new mode flags or response fields for `code_find`
- changing `code_show`

## Success Criteria

- `query: "adapter"` returns useful matches such as `Adapter`,
  `adapterFactory`, and `GitWarpAdapter`
- glob queries like `handle*` continue to work
- live and WARP search paths agree on the discovery behavior
