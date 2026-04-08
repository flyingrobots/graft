# Sludge detector

Scan a file's outline for structural signals that indicate sludge:

- `@typedef` count vs class count (phantom shape ratio)
- `@type {` cast density (hand-holding tsc ratio)
- `function build*` not inside a class (homeless constructor ratio)
- Free functions that take a type as first arg (behavior not on
  owning type)
- Single-file symbol count above threshold (god object signal)

`graft doctor --sludge` or a `sludge_score` field on `file_outline`
responses. The agent sees the score before deciding whether to
refactor. The human sees it in CI as a ratchet.

Not a linter — a structural smell detector that uses tree-sitter
outlines, not regex. Knows the difference between a factory that
delegates to `new X()` and a homeless constructor that returns a
plain object.

Depends on: file_outline (shipped), tree-sitter parsing (shipped).
