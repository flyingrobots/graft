---
title: "Migrate all path operations to PathOps port"
legend: CORE
lane: v0.7.0
---

# Migrate all path operations to PathOps port

Source: audit during churn-path-filter-exact-only cycle (2026-04-19)

The `PathOps` port (`src/ports/paths.ts`) and its node adapter
(`src/adapters/node-paths.ts`) now exist and are used by `structural-churn`
and `structural-log`. However, ~130+ path operations across 39+ files
still use `node:path` directly in non-adapter code.

## Scope

Migrate all `path.resolve`, `path.join`, `path.relative`, `path.normalize`,
`path.isAbsolute`, `path.dirname`, `path.basename`, `path.extname` calls
outside of `src/adapters/` to use the `PathOps` port.

## Priority areas (by leakage severity)

1. **MCP layer** (~25+ instances) — workspace router, context, runtime overlay
2. **CLI layer** (~20+ instances) — init, command parsing, client config
3. **Hooks layer** (~2 instances) — path traversal validation
4. **Git layer** (~5 instances) — hook bootstrap

## Approach

- Thread `PathOps` through options where needed
- Expand `PathOps` interface as needed (e.g., `dirname`, `basename`, `relative`)
- One sub-cycle per layer to keep PRs reviewable

Effort: L (multi-cycle)
