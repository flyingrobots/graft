# Graft Information Architecture

This is not a visual design system. It is the information-architecture
contract for Graft's operator-facing docs, CLI output, and MCP output.

## Documentation signposts

- `README.md` answers what Graft is and the fastest correct start
- `GUIDE.md` is the orientation layer
- `docs/SETUP.md` is client/bootstrap procedure
- `docs/CLI.md` and `docs/MCP.md` are surface references
- `ADVANCED_GUIDE.md` and `ARCHITECTURE.md` explain the deeper model
- `docs/strategy/*` holds policy and provenance posture that must stay
  stable across releases

## Output posture

- machine-readable first
- explicit `_schema` versioning
- explicit `_receipt` decision metadata
- explicit degraded truth when footing is partial
- reason codes over prose-only refusals

## Writing rules

- answer the operator question first
- prefer bounded summaries over giant dumps
- distinguish current truth from future WARP direction
- never present local `artifact_history` as canonical provenance

## Naming posture

Use stable terms consistently:

- `commit_worldline`
- `ref_view`
- `workspace_overlay`
- transport session
- causal workspace
- strand
- checkout epoch

## Why this exists

Graft's users are often coding agents. Information architecture matters
because ambiguity becomes tool misuse, context waste, or false
confidence.
