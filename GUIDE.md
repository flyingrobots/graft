# Guide — Graft

This is the developer-level operator guide for Graft. Use it for orientation, the productive-fast path, and to understand how the context governor orchestrates agentic reads.

For deep-track doctrine, worldline internals, and repository-wide engineering standards, use [ADVANCED_GUIDE.md](./ADVANCED_GUIDE.md).

## Choose Your Lane

### 1. Initialize a Repository
Bootstrap a new repo with read policies, git hooks, and agent instructions.
- **Run**: `npx @flyingrobots/graft init`
- **Read**: [Setup Guide](./docs/SETUP.md) (Detailed per-editor steps)

### 2. Standalone CLI Usage
Manually enforce policies or inspect structural history from your terminal.
- **Read**: [CLI Signpost](./docs/CLI.md)

### 3. Shared Daemon Mode
Run the central execution authority for multi-repo work and persistent monitors.
- **Run**: `npx @flyingrobots/graft daemon`
- **Read**: [Architecture](./ARCHITECTURE.md) (Daemon section)

## Big Picture: System Orchestration

Graft is a tiered governor. It manages the context burden across three layers:

1. **Graft Core (Policy)**: Pure TypeScript logic that evaluates file size, language support, and session budgets to decide *what* an agent should see.
2. **Parser (Meaning)**: Uses Tree-Sitter WASM to extract structural outlines and compute diffs, turning raw files into actionable meaning.
3. **WARP (Memory)**: The structural graph that tracks AST evolution across commits, providing a provenance-aware history of the repository.

## Orientation Checklist

- [ ] **I am setting up a new project**: Start with `README.md` Quick Start.
- [ ] **I am configuring Claude Code**: Use `npx graft init --write-claude-hooks`.
- [ ] **I am debugging a structural diff**: Use `npx graft struct diff --json`.
- [ ] **I am contributing to Graft**: Read `METHOD.md` and `docs/BEARING.md`.

## Rule of Thumb

If you need a comprehensive tool reference, use the [MCP Signpost](./docs/MCP.md).

If you need to know "what's true right now," use [docs/BEARING.md](./docs/BEARING.md).

If you are just starting, use the [README.md](./README.md) and the setup instructions in [docs/SETUP.md](./docs/SETUP.md).

---
**The goal is inevitably. Every feature is defined by its tests.**
