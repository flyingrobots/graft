# Add an operator setup decision table to the docs

The 2026-04-07 documentation-quality audit found that setup guidance is
accurate but fragmented across too many modes:

- MCP only
- Claude hooks plus MCP
- project-local versus global config
- `init --write-*` versus manual config editing

Why this matters:
- a new operator has to infer which path applies to them
- the information exists, but the decision flow does not
- this slows time-to-value even when the underlying tooling is ready

Desired end state:
- `docs/GUIDE.md` contains a concise decision table or flow that tells
  operators which setup path to choose
- README links to that table directly
- the table stays aligned with current `graft init` bootstrap flags and
  explicit `serve` transport startup

Effort: S
