---
title: "Make project root dynamic for MCP server"
legend: "MCP"
priority: "high"
---

# Make project root dynamic for MCP server

The Graft MCP server is currently anchored to its own repository root when started via `process.cwd()`. This prevents tools like `graft_map` and `run_capture` from working correctly when used in other projects.

## Goal
- Make the `projectRoot` dynamic or configurable via environment variables (e.g. `GRAFT_PROJECT_ROOT`).
- Ensure the server can correctly analyze the workspace it is actually running in.
- Consider exposing `workspace_bind` even in `repo_local` mode to allow dynamic switching.

## Evidence
In the Facet project, Graft reported the Graft repo root as the project root even though it was being invoked from the Facet directory.
