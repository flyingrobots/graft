---
title: warp port and adapter boundary
legend: CORE
lane: up-next
blocked_by:
  - docs/method/backlog/asap/CORE_hex-layer-map-and-dependency-guardrails.md
blocks:
  - docs/method/backlog/up-next/CORE_composition-roots-for-cli-mcp-daemon-and-hooks.md
---

# warp port and adapter boundary

Introduce a first-class WARP port so Graft depends on an explicit graph capability contract rather than direct `openWarp()` calls and cast-based seams. The goal is one truthful secondary adapter for graph commitment and observer reads.
