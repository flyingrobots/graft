---
title: "Cycle 0018 — Dockerfile"
---

# Cycle 0018 — Dockerfile

**Legend**: CORE
**Branch**: cycle/0018-dockerfile
**Status**: complete

## Goal

Run graft as an MCP server in Docker without installing Node.

## What shipped

- `Dockerfile` — Node 22 Alpine, pnpm install, copies bin/ and src/.
  Uses `NODE_PATH` to resolve dependencies from `/app/node_modules`
  even when working directory is `/workspace`.
- `.dockerignore` — excludes node_modules, .git, test, docs.
- README updated with Docker usage instructions.
- Design doc: `docs/design/0018-dockerfile/design.md`.

## Decisions

1. **Absolute paths in ENTRYPOINT** — `tsx` is loaded via its full
   path inside `/app/node_modules` to avoid resolution conflicts
   with the mounted workspace's own `node_modules`.
2. **`NODE_PATH=/app/node_modules`** — ensures all imports resolve
   from the container's dependencies, not the host's.
3. **No build step** — `tsx` handles TypeScript directly. The
   container ships source, not compiled JS.
4. **`--prod=false`** — installs devDependencies because `tsx` is
   in `dependencies` but uses `esbuild` which needs platform-native
   binaries built inside the container.

## Metrics

- 1 commit
- 3 new files (Dockerfile, .dockerignore, design doc)
- 1 modified file (README.md)
- Docker image builds and serves MCP tools over stdio
