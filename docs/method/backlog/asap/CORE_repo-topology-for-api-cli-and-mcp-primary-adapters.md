---
title: "repo topology for api cli and mcp primary adapters"
legend: CORE
lane: asap
---

# repo topology for api cli and mcp primary adapters

The repo still makes primary adapter boundaries harder to see than they should be. Shape and execute a directory/topology plan that makes API, CLI, and MCP visibly first-class entry points around one application core instead of leaving API mostly as a root-export convention and the others under `src/cli` and `src/mcp`.
