# Graft

A context governor for coding agents. Graft enforces read policy so agents consume the smallest structurally correct view of a codebase instead of dumping raw files into their context window.

[![npm version](https://img.shields.io/npm/v/@flyingrobots/graft)](https://www.npmjs.com/package/@flyingrobots/graft)

![Graft demo](./docs/assets/graft.svg)

---

## TL;DR — Up and Running in 30 Seconds

**What it is**: Graft sits between your AI coding agent and the filesystem. Instead of dumping entire files into the context window, it returns the minimum structurally correct view — full content for small files, AST-derived outlines for large ones, hard refusals for secrets and binaries. Tool responses carry receipts so agents know exactly how much context they've consumed.

**Why you want it**: Agents that read files naively fill their context window with lockfiles, minified output, and 2,000-line modules they only needed 10 lines of. Graft fixes that automatically.

```bash
# Install and bootstrap your repo
npx @flyingrobots/graft init --write-claude-hooks --write-codex-mcp

# Start serving (MCP over stdio — point your agent at this)
npx @flyingrobots/graft serve

# Or try a governed read from the CLI right now
npx @flyingrobots/graft read safe src/app.ts
```

That's it. `init` scaffolds `.graftignore`, appends agent read guidance, and writes the client config requested by the flags you pass. `serve` starts listening on stdio. Your agent calls `safe_read` instead of reading files directly, and Graft handles the rest.

---

## The Problem

AI coding agents read files the same way a first-year developer does: grab the whole thing, every time. A 2,000-line module goes straight into the context window. So does the lockfile. So does the compiled output. So does the `.env`.

Context windows are finite. Once they fill up, the agent starts forgetting what it already read. Performance degrades. Hallucinations increase. You burn tokens on noise.

Graft sits between the agent and the filesystem and enforces a simple rule: **return the minimum structurally correct view**.

- Small file? Full content.
- Large file? A structural outline — function names, signatures, line ranges. The agent can drill in with a range read if it needs a specific function body.
- Binary, secret, or lockfile? Hard refusal with a machine-readable reason code and a suggested alternative.

Tool responses carry receipts: bytes consumed, bytes avoided, session depth, policy decision. Agents can self-regulate. Operators can audit.

---

## Why Graft?

- **Parser-backed outlines.** Outlines come from Tree-Sitter ASTs, not heuristic line-scanning. Function signatures, class hierarchies, and jump tables are structurally accurate across JavaScript, TypeScript, Rust, Python, Go, GraphQL, JSON, TOML, YAML, Markdown, and more.

- **Machine-readable contracts.** Tool responses carry versioned `_schema` metadata and decision receipts. Agents reason about outcomes without scraping prose. Receipts accumulate cumulative session stats so agents know when they're burning budget.

- **Structural memory across Git history.** WARP (Structural Worldline Memory) is the current git-warp-backed structural history layer. Query what changed structurally — which symbols were added, removed, or renamed — without dumping source into the agent context. Graft is converging on a `StructuralReadingPort` boundary so Echo can become the primary causal-history substrate after parity is proven.

- **Session governance.** The `GovernorTracker` watches for anti-patterns: runaway tool loops, late-session large reads, edit/bash thrash. Tripwire signals surface in receipts so agents and operators can act before context is exhausted.

- **Industrial-grade daemon.** A same-user local runtime manages multi-repo authorization, persistent monitors, and shared worker pools. Current git-warp contexts stay warm in memory across sessions, while the public contract is moving behind substrate-neutral structural-history ports.

---

## Three Official Entry Points

Graft exposes capabilities through three official product entry points: CLI, MCP, and API. MCP has two runtimes: repo-local stdio for a single checkout and daemon-backed stdio for multi-repo sessions.

### 1. CLI — Operator and Debugging Workflows

```bash
npx @flyingrobots/graft read safe src/app.ts
npx @flyingrobots/graft struct since HEAD~3
npx @flyingrobots/graft struct dead-symbols --limit 20
npx @flyingrobots/graft symbol history createUser --path src/users.ts
npx @flyingrobots/graft review --base HEAD~1
npx @flyingrobots/graft review cooldown --pr 48
```

Stateless. Print and exit. Good for scripting, spot-checking policy decisions, and inspecting structural history.

### 2. MCP — Agent Sessions

#### Repo-Local Stdio

The simplest path for single-repo agent work. The current checkout is the authority. No workspace binding required.

```bash
npx @flyingrobots/graft serve
```

Point your MCP client at this process. Graft speaks JSON-RPC over stdin/stdout. The same binary auto-detects non-TTY stdio and enters serve mode automatically — so `npx @flyingrobots/graft` with no arguments works as an MCP server when piped.

#### Daemon-Backed Stdio

A persistent same-user runtime for long-running or multi-repo agent work. Current git-warp contexts stay warm between sessions and persistent monitors can keep structural history current.

```bash
# Start the daemon explicitly
npx @flyingrobots/graft daemon

# Or let the stdio bridge auto-start/connect to the daemon
npx @flyingrobots/graft serve --runtime daemon
```

Daemon sessions start unbound. The normal agent flow is:

1. `workspace_open` with the target repo's `cwd`; in daemon mode this authorizes the workspace before opening it.
2. Optionally `workspace_list_opened` to inspect active workspaces
3. Use repository-scoped tools: `safe_read`, `file_outline`, `graft_diff`, etc.

For explicit control-plane posture, use `workspace_authorize` followed by `workspace_bind`.

See [docs/SETUP.md](./docs/SETUP.md) for client-specific bootstrap and daemon control-plane configuration.

### 3. API — In-Process Integration

Embed Graft directly when you want structural reads or syntax data without spawning a subprocess or going through MCP transport.

**Governed repo reads** (same policy enforcement as MCP, no receipts):
```ts
import { createRepoWorkspace } from "@flyingrobots/graft";

const workspace = await createRepoWorkspace({ cwd: process.cwd() });
const result = await workspace.safeRead({ path: "src/app.ts" });
// result.projection: "content" | "outline" | "refused" | "cache_hit" | "diff"
```

**In-process tool calls with receipts** (full MCP behavior, no subprocess):
```ts
import { createRepoLocalGraft, callGraftTool } from "@flyingrobots/graft";

const graft = createRepoLocalGraft({ cwd: process.cwd() });
const outline = await callGraftTool(graft, "file_outline", { path: "src/app.ts" });
```

**Editor-native syntax highlighting** (Tree-Sitter WASM, no I/O, viewport-aware):
```ts
import { createProjectionBundle, ensureParserReady } from "@flyingrobots/graft";

await ensureParserReady();

const bundle = createProjectionBundle("src/app.tsx", liveEditorText, {
  basis: { kind: "editor_head", headId: "head-42", tick: 17 },
  viewport: {
    start: { row: 0, column: 0 },
    end: { row: 80, column: 0 },
  },
});
// bundle.syntax.spans — highlight ranges for the visible viewport only
```

`createProjectionBundle` owns the WASM buffer lifecycle internally. Use `createStructuredBuffer` directly if you need to hold a buffer across multiple operations and manage `dispose()` yourself.

---

## Quick Start

```bash
# 1. Bootstrap the repo: scaffold .graftignore, seed agent instructions
npx @flyingrobots/graft init --write-claude-hooks --write-codex-mcp

# 2. Start serving (repo-local stdio MCP)
npx @flyingrobots/graft serve
```

## Contributing with public visibility

For bugs, capability requests, and ideas, start at
[GitHub Issues](https://github.com/flyingrobots/graft/issues).
That queue is the public view for priorities and discussion. Internal execution and design rigor still lives in
`docs/method/backlog/` and `docs/design/` so details remain deterministic for contributors.

---

## Documentation

| Document | What it covers |
|----------|---------------|
| [Technical Teardown](./docs/TECHNICAL_TEARDOWN.md) | Zero-to-hero deep dive: entry points, golden paths, data schemas, policy engine, WARP, session governance, trade-offs |
| [Guide](./GUIDE.md) | Orientation, the fast path, and agent bootstrap |
| [Setup Guide](./docs/SETUP.md) | Client-specific MCP setup, daemon posture, and workspace binding |
| [Advanced Guide](./ADVANCED_GUIDE.md) | Pipeline internals, worldlines, and daemon mechanics |
| [Architecture](./ARCHITECTURE.md) | Authoritative structural reference: Ports, Adapters, WARP |
| [Public API Contract](./docs/public-api.md) | Semver-public root import surface and stability policy |
| [Three-Surface Capability Matrix](./docs/three-surface-capability-matrix.md) | API / CLI / MCP feature baseline and peer posture |
| [Repo Topology](./docs/repo-topology.md) | Where API, CLI, MCP, and core live in the source tree |
| [Security Model](./docs/strategy/security-model.md) | Same-user daemon trust boundaries, authz, and observability |
| [Causal Provenance](./docs/strategy/causal-provenance.md) | Transport sessions, causal workspaces, strands, and handoff truth |
| [North Star](./NORTHSTAR.md) | Long-term stack position and Continuum-shaped direction |
| [Vision](./docs/VISION.md) | Core tenets and the provenance-aware mission |
| [Method](./METHOD.md) | Repo work doctrine and the cycle loop |
| [Issue visibility and backlog mapping](./docs/github-issues-mirroring.md) | Public issue triage plus internal backlog synchronization |

---

Built with precision by [FLYING ROBOTS](https://github.com/flyingrobots)
