---
title: "Codebase orientation map"
feature: session
kind: trunk
legend: CORE
lane: graveyard
superseded: true
superseded_reason: "Retired as standalone work: the shipped graft_map surface covers recursive structural codebase orientation"
requirements:
  - "file_outline tool exists (shipped)"
  - "Tree-sitter parsing pipeline (shipped)"
acceptance_criteria:
  - "graft map produces recursive structural outline of a directory tree"
  - "Output includes function signatures, class hierarchies, export surfaces"
  - "Respects .graftignore policy"
---

# Codebase orientation map

## Disposition

Retired as standalone backlog work. The codebase-orientation surface
already shipped through `graft_map`, including bounded overview mode,
summary mode, structural outlines, and `.graftignore` policy handling.
The live completion evidence is in `docs/method/retro/SURFACE_graft-map-bounded-overview/`
and related `graft_map` retros; this note remains only as historical
context for the original proposal.

`graft map` or `graft outline src/` — recursive structural outline
of an entire directory tree. Function signatures, class hierarchies,
export surfaces across all files. No function bodies.

New developer or agent joins a project, runs one command, gets
instant orientation. "Here's the shape of the codebase" in a few KB
instead of reading hundreds of files.

Could respect .graftignore and policy (skip vendor/, dist/, etc.)
for a curated view.
