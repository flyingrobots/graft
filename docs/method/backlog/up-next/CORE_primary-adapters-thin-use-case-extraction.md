---
title: primary adapters thin use-case extraction
legend: CORE
lane: up-next
blocked_by:
  - docs/method/backlog/asap/CORE_hex-layer-map-and-dependency-guardrails.md
blocks:
  - docs/method/backlog/up-next/CORE_composition-roots-for-cli-mcp-daemon-and-hooks.md
  - docs/method/backlog/up-next/CORE_runtime-validated-command-and-context-models.md
---

# primary adapters thin use-case extraction

Move product behavior out of MCP/CLI tool handlers and into reusable application services. The target is thin primary adapters that validate input, call one application use case, and shape edge-specific output without owning business flow.
