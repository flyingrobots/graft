# Graft

An industrial-grade context governor for coding agents. Graft enforces read policy so agents consume the smallest structurally correct view of a codebase instead of dumping raw files into their context window.

Graft is designed for the operator who demands precision and the architect who needs a stable foundation for agentic work. It scales from simple policy-aware reads to high-fidelity causal provenance tracking across multi-session worktrees.

[![npm version](https://img.shields.io/npm/v/@flyingrobots/graft)](https://www.npmjs.com/package/@flyingrobots/graft)
[![License](https://img.shields.io/github/license/graft)](./LICENSE)

![Graft demo](./docs/assets/graft.svg)

## Why Graft?

Unlike simple file-scraping tools, Graft treats the repository as a layered worldline of code structure and causal activity.

- **Policy-Enforced Reads**: Automatically degrades large files to structural outlines and jump tables. Refuses binaries, secrets, and lockfiles with machine-readable reasons.
- **Structural Memory**: Uses WARP to track AST evolution across Git commits. Query what changed structurally without reading a single byte of source code.
- **Causal Provenance**: Tracks the *why* behind structural changes by logging read, stage, and transition activity into strand-scoped causal workspaces.
- **Industrial-Grade Daemon**: A same-user local runtime that manages multi-repo authorization, background indexing, and shared-machine worker pools.

## Quick Start

### 1. Initialize a Repo
Scaffold `.graftignore`, setup git hooks, and seed agent instructions.
```bash
npx @flyingrobots/graft init --write-claude-hooks --write-codex-mcp
```

### 2. Standalone CLI
Enforce policy on a single read or inspect structural history.
```bash
npx @flyingrobots/graft read safe src/app.ts
npx @flyingrobots/graft struct since HEAD~3
```

### 3. Run the Daemon
Start the system-wide execution authority for multi-session work.
```bash
npx @flyingrobots/graft daemon
```

## Documentation

- **[Guide](./GUIDE.md)**: Orientation, the fast path, and agent bootstrap.
- **[Advanced Guide](./ADVANCED_GUIDE.md)**: Deep dives into the pipeline, worldlines, and daemon mechanics.
- **[Architecture](./ARCHITECTURE.md)**: The authoritative structural reference (Ports, Adapters, WARP).
- **[Vision](./docs/VISION.md)**: Core tenets and the provenance-aware mission.
- **[Method](./METHOD.md)**: Repo work doctrine and the cycle loop.

---
Built with precision by [FLYING ROBOTS](https://github.com/flyingrobots)
