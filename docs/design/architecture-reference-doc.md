---
title: "Cycle 0040 — Architecture Reference Doc"
---

# Cycle 0040 — Architecture Reference Doc

**Hill:** Graft has a single contributor-facing architecture reference
that explains how CLI, MCP, hooks, policy, layered worldline semantics,
and WARP fit together.

## Why now

The product docs are strong and the direction docs are strong, but the
repo still lacked one stable systems map for contributors. Audits kept
finding the same gap: engineers could reconstruct the runtime model
from code, but the repo did not teach it directly.

## Playback questions

- Can a contributor explain the role of CLI, MCP, and hooks after
  reading one document?
- Does the doc explain where policy is enforced?
- Does the doc explain layered worldline semantics without requiring
  code spelunking first?
- Does the doc explain the WARP write/read split?
- Is the doc easy to find from `README.md` and `CONTRIBUTING.md`?

## Scope

- create `ARCHITECTURE.md`
- explain runtime surfaces
- explain the shared policy seam
- explain layered worldline semantics
- explain WARP write path versus read path
- link from `README.md` and `CONTRIBUTING.md`

## Non-goals

- replacing directional docs like `docs/BEARING.md` or `docs/VISION.md`
- closing the underlying cleanup hotspots called out in architecture
  discussion
