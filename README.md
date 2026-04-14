# Graft

An industrial-grade context governor for coding agents. Graft enforces read policy so agents consume the smallest structurally correct view of a codebase instead of dumping raw files into their context window.

Graft is designed for the operator who demands precision and the architect who needs a stable foundation for agentic work. It scales from simple policy-aware reads to high-fidelity causal provenance tracking across multi-session worktrees.

[![npm version](https://img.shields.io/npm/v/@flyingrobots/graft)](https://www.npmjs.com/package/@flyingrobots/graft)
[![License](https://img.shields.io/github/license/graft)](./LICENSE)

![Graft demo](./docs/assets/graft.svg)

## Why Graft?

Unlike simple file-scraping tools, Graft treats the repository as a layered worldline of code structure and causal activity.

- **Policy-Enforced Reads**: Automatically degrades large files to structural outlines and jump tables. Refuses binaries, secrets, and lockfiles with machine-readable reasons.
- **Machine-Readable Contracts**: Responses carry versioned `_schema` metadata and decision receipts so agents can reason about outcomes without scraping prose.
- **Structural Memory**: Uses WARP (Structural Worldline Memory) to track AST evolution across Git commits. Query what changed structurally without reading a single byte of source code.
- **Causal Provenance**: Tracks the *why* behind structural changes by logging read, stage, and transition activity into strand-scoped causal workspaces.
- **Industrial-Grade Daemon**: A same-user local runtime that manages multi-repo authorization, background indexing, and shared-machine worker pools.

## Quick Start

### 1. Bootstrap a Repo
Scaffold `.graftignore`, setup git hooks, and seed agent instructions.
```bash
npx @flyingrobots/graft init --write-claude-hooks --write-codex-mcp
```

### 2. Repo-Local Stdio MCP
This is the simplest per-repo path for most clients. The current
checkout is the authority, and there is no separate workspace binding
step.
```bash
npx @flyingrobots/graft serve
```

### 3. Standalone CLI
Enforce policy on a single read or inspect structural history.
```bash
npx @flyingrobots/graft read safe src/app.ts
npx @flyingrobots/graft struct since HEAD~3
```

### 4. Direct Library API
Embed Graft in-process when you want direct access without MCP transport
or CLI process orchestration.
```ts
import { createRepoLocalGraft, callGraftTool } from "@flyingrobots/graft";

const graft = createRepoLocalGraft({ cwd: process.cwd() });
const outline = await callGraftTool(graft, "file_outline", { path: "src/app.ts" });
```

This uses the same repo-local core as the CLI and MCP server, but it
lets host tools call Graft directly inside the same process.

For close editor integration, use the buffer-native surface directly:
```ts
import { createStructuredBuffer } from "@flyingrobots/graft";

const buffer = createStructuredBuffer("src/app.tsx", liveEditorText);
const spans = buffer.syntaxSpans({
  viewport: {
    start: { row: 0, column: 0 },
    end: { row: 80, column: 0 },
  },
});
const context = buffer.nodeAt({ row: 24, column: 12 });
const rename = buffer.renamePreview({
  position: { row: 24, column: 12 },
  nextName: "nextValue",
});
```

### 5. Shared Daemon Runtime
Start the same-user execution authority for multi-session or multi-repo
work.
```bash
npx @flyingrobots/graft daemon
```

Daemon sessions start `unbound`. If your client connects through the
daemon instead of repo-local stdio, the first repo-scoped flow is:

1. `workspace_authorize` for the target repo/worktree
2. `workspace_bind` for the active daemon session
3. then use repository-scoped tools such as `safe_read`

Use [docs/SETUP.md](./docs/SETUP.md) for the exact client bootstrap and
daemon control-plane posture.

## Documentation

- **[Guide](./GUIDE.md)**: Orientation, the fast path, and agent bootstrap.
- **[Setup Guide](./docs/SETUP.md)**: Client-specific MCP setup, daemon posture, and workspace binding.
- **[Advanced Guide](./ADVANCED_GUIDE.md)**: Deep dives into the pipeline, worldlines, and daemon mechanics.
- **[Architecture](./ARCHITECTURE.md)**: The authoritative structural reference (Ports, Adapters, WARP).
- **[Security Model](./docs/strategy/security-model.md)**: Same-user daemon trust boundaries, authz, and observability posture.
- **[Causal Provenance](./docs/strategy/causal-provenance.md)**: Transport sessions, causal workspaces, strands, and handoff truth.
- **[Vision](./docs/VISION.md)**: Core tenets and the provenance-aware mission.
- **[Method](./METHOD.md)**: Repo work doctrine and the cycle loop.

---
Built with precision by [FLYING ROBOTS](https://github.com/flyingrobots)
