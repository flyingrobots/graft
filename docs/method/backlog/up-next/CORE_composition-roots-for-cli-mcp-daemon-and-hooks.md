---
title: composition roots for cli mcp daemon and hooks
legend: CORE
lane: up-next
blocked_by:
  - docs/method/backlog/asap/CORE_hex-layer-map-and-dependency-guardrails.md
  - docs/method/backlog/up-next/CORE_primary-adapters-thin-use-case-extraction.md
  - docs/method/backlog/up-next/CORE_warp-port-and-adapter-boundary.md
---

# composition roots for cli mcp daemon and hooks

Split entrypoint wiring from application services. CLI, MCP stdio, daemon transport, and hook scripts should each become explicit composition roots that assemble the same underlying services rather than carrying overlapping orchestration logic.
