# Graft Architecture

This document is the contributor-facing system map for Graft. It sits
between the operator docs in `README.md` / `docs/GUIDE.md` and the
directional docs in `docs/BEARING.md` / `docs/VISION.md`.

If you need the shortest possible summary:

- **CLI** is the human/debug surface.
- **MCP** is the primary agent surface.
- **Hooks** are a Claude-side safety net for native `Read`.
- **Policy** decides what kind of read is allowed.
- **Repo state** gives layered worldline context about the current
  checkout and working tree.
- **WARP** stores and serves structural history over Git.

## Product surfaces

### CLI

Runtime entry:
- [graft.js](/Users/james/git/graft/bin/graft.js)
- [main.ts](/Users/james/git/graft/src/cli/main.ts)

Purpose:
- human-facing debugging
- local testing of MCP peer commands
- bootstrap and admin commands such as `init` and `index`

Current shape:
- `graft` with no args prints help for humans
- `graft serve` starts the stdio MCP server explicitly
- grouped namespaces mirror the core MCP surface:
  - `read`
  - `struct`
  - `symbol`
  - `diag`

The CLI is intentionally not the primary product contract. It exists so
operators and contributors can inspect the same bounded surfaces without
having to attach a separate MCP client.

### MCP

Runtime entry:
- [server.ts](/Users/james/git/graft/src/mcp/server.ts)
- [stdio.ts](/Users/james/git/graft/src/mcp/stdio.ts)
- [stdio-server.ts](/Users/james/git/graft/src/mcp/stdio-server.ts)

Purpose:
- primary agent surface
- structured tool responses with receipts and versioned `_schema`
  metadata
- policy-aware bounded read access

Current shape:
- `graft serve` runs one repo-rooted stdio server per process
- `graft daemon` runs one local daemon host per process and many daemon
  sessions beneath it
- daemon mode now includes a central authorization and inspection
  control plane for workspaces and sessions
- daemon mode now also includes one repo-scoped persistent monitor
  runtime per canonical repo, currently used for background incremental
  WARP indexing
- each server or daemon session owns one `SessionTracker`,
  `ObservationCache`, `Metrics`, and `RepoStateTracker` slice
- lazy WARP initialization still happens only when a WARP-backed tool
  needs it

This is now enough to make the local daemon and first monitor contract
real without pretending the broader system-wide story is finished.

### Hooks

Runtime entry:
- [pretooluse-read.ts](/Users/james/git/graft/src/hooks/pretooluse-read.ts)
- [posttooluse-read.ts](/Users/james/git/graft/src/hooks/posttooluse-read.ts)
- [shared.ts](/Users/james/git/graft/src/hooks/shared.ts)

Purpose:
- govern Claude Code native `Read` calls when the agent bypasses graft's
  MCP tools
- block obviously banned reads before they happen
- show what `safe_read` would have returned after a native read

Hooks are not the full product surface. They are a safety rail around a
host tool that Graft does not control directly.

## Request flow

The normal happy path for an MCP tool looks like this:

1. A client calls a tool such as `safe_read`.
2. [server.ts](/Users/james/git/graft/src/mcp/server.ts) validates the
   input with Zod when the tool declares a schema.
3. The server records session/tool metrics and refreshes repo-state
   observation.
4. If the tool is marked `policyCheck: true`, middleware performs a
   path-based precheck before the handler runs.
5. The tool handler executes with a shared
   [ToolContext](/Users/james/git/graft/src/mcp/context.ts).
6. The handler returns data through `ctx.respond(...)`.
7. [receipt.ts](/Users/james/git/graft/src/mcp/receipt.ts) attaches
   `_receipt` and versioned `_schema` metadata.

That flow is the key architectural rule: handlers should compose shared
infrastructure rather than doing their own ad hoc parsing, shaping, and
serialization.

## Shared policy seam

Core modules:
- [evaluate.ts](/Users/james/git/graft/src/policy/evaluate.ts)
- [graftignore.ts](/Users/james/git/graft/src/policy/graftignore.ts)
- [policy.ts](/Users/james/git/graft/src/mcp/policy.ts)

Policy is the heart of Graft. It decides:
- whether content is allowed at all
- whether content should be returned as full text, outline, diff, or
  refusal
- whether session depth or budget should tighten the response
- whether `.graftignore` suppresses the path entirely

Important distinction:
- `src/policy/*` holds the domain logic
- `src/mcp/policy.ts` adapts that domain logic to the MCP runtime
  contract

The repo’s current doctrine is that bounded-read surfaces should share
one policy contract across:
- MCP tools
- CLI peers
- hooks
- working-tree and git-backed structural reads

One explicit exception remains:
- `run_capture` is a shell escape hatch outside the bounded-read policy
  contract, and it declares that explicitly through `policyBoundary`

## Layered worldline model

Core module:
- [repo-state.ts](/Users/james/git/graft/src/mcp/repo-state.ts)

Graft no longer treats “current repo state” as a single flat idea. The
MCP surface now distinguishes three layers:

- `commit_worldline`
  - durable history grounded in commits
- `ref_view`
  - branch/ref comparisons over that durable history
- `workspace_overlay`
  - the current dirty working tree and checkout state

`RepoStateTracker` infers lightweight semantic transitions such as:
- `checkout`
- `reset`
- `merge`
- `rebase`

The current implementation is tool-call-driven, not watcher-driven. In
other words, repo-state is refreshed between requests, not from a
continuous filesystem daemon yet.

This is also where the current architecture still shows strain:
- raw git process access
- status/reflog parsing
- transition inference
- observation shaping

all still live in one module. That is why `repo-state` remains a known
cleanup hotspot in backlog.

## WARP: write path vs read path

### Write path

Core modules:
- [indexer.ts](/Users/james/git/graft/src/warp/indexer.ts)
- [open.ts](/Users/james/git/graft/src/warp/open.ts)

The write side turns Git history into structural graph facts.

High-level flow:
1. open a WARP graph backed by Git plumbing
2. enumerate commits to index
3. compute changed files for each commit
4. extract structural outlines and diffs
5. write structural patch facts into the graph

This is the “materialize history into structure” side of Graft.

### Read path

Core modules:
- [observers.ts](/Users/james/git/graft/src/warp/observers.ts)
- [precision.ts](/Users/james/git/graft/src/mcp/tools/precision.ts)
- [graft-diff.ts](/Users/james/git/graft/src/mcp/tools/graft-diff.ts)
- [since.ts](/Users/james/git/graft/src/mcp/tools/since.ts)
- [map.ts](/Users/james/git/graft/src/mcp/tools/map.ts)

The read side does not traverse graph internals by hand. Instead it
uses the Observer Law:

- write facts into WARP
- read projections through observers/lenses
- keep graph traversal knowledge localized

This is why [observers.ts](/Users/james/git/graft/src/warp/observers.ts)
is small but important. It is the canonical read vocabulary for the
graph.

## Parser and operations layer

Core modules:
- [lang.ts](/Users/james/git/graft/src/parser/lang.ts)
- [outline.ts](/Users/james/git/graft/src/parser/outline.ts)
- [diff.ts](/Users/james/git/graft/src/parser/diff.ts)
- [safe-read.ts](/Users/james/git/graft/src/operations/safe-read.ts)
- [file-outline.ts](/Users/james/git/graft/src/operations/file-outline.ts)
- [read-range.ts](/Users/james/git/graft/src/operations/read-range.ts)
- [graft-diff.ts](/Users/james/git/graft/src/operations/graft-diff.ts)

This layer is where Graft turns files into structural meaning.

Responsibilities:
- detect supported languages
- extract outlines and jump tables
- compute structural diffs
- implement bounded read behavior independently of transport

This separation matters because it lets MCP, CLI, and tests share the
same behavior without duplicating core logic.

## Ports and adapters

Ports:
- [filesystem.ts](/Users/james/git/graft/src/ports/filesystem.ts)
- [codec.ts](/Users/james/git/graft/src/ports/codec.ts)

Adapters:
- [node-fs.ts](/Users/james/git/graft/src/adapters/node-fs.ts)
- [canonical-json.ts](/Users/james/git/graft/src/adapters/canonical-json.ts)

Graft is not purely hexagonal everywhere, but it does follow the
pattern in important places:
- core logic avoids reaching straight into `node:fs` when a stable port
  exists
- JSON shaping/serialization is pushed through a codec boundary
- shared runtime dependencies are injected through `ToolContext`

The largest remaining hexagonal gap is process execution. Git and shell
work still happen through direct subprocess calls in a few hotspots,
which is already tracked in backlog.

## Session, cache, receipts

Core modules:
- [tracker.ts](/Users/james/git/graft/src/session/tracker.ts)
- [cache.ts](/Users/james/git/graft/src/mcp/cache.ts)
- [cached-file.ts](/Users/james/git/graft/src/mcp/cached-file.ts)
- [receipt.ts](/Users/james/git/graft/src/mcp/receipt.ts)
- [metrics.ts](/Users/james/git/graft/src/mcp/metrics.ts)

These modules are what make Graft a governor instead of just a fancy
file reader.

They provide:
- session-depth awareness
- budget tracking
- tripwires
- re-read suppression
- structural diffs for changed files
- cumulative metrics
- response receipts and schema metadata

In practice:
- policy decides *what* can be returned
- cache/session/metrics decide *how expensive and how repeated* the
  interaction has become

## Current architectural tensions

The repo has a clear shape, but a few real tensions remain:

1. **Repo-scoped stdio server vs shared daemon future**
   - current MCP shape assumes one rooted context per process
   - future system-wide use needs explicit repo/worktree/session binding

2. **Daemon/system-wide seams are still broader than they should be**
   - filesystem, codec, git, and process ports now exist
   - daemon hosting, control-plane projection, and monitor orchestration
     still want narrower seams before more system-wide behavior lands

3. **Docs and direction are strong, contributor map was missing**
   - this file exists to close exactly that gap

## Daemon evolution path

Current repo-local path:

- `graft serve` starts one repo-rooted stdio server
- `startStdioServer(cwd)` passes that cwd into `createGraftServer()`
- one process holds one rooted `SessionTracker`, `ObservationCache`,
  `Metrics`, and `RepoStateTracker`

Current local shared-daemon path:

- `graft daemon` owns local-only transport and session lifecycle
- daemon sessions start unbound
- a daemon-only workspace bind step resolves repo/worktree identity
  server-side before repo-scoped tools run
- MCP traffic lives at `/mcp`, and liveness lives at `/healthz`
- each daemon transport session owns its own daemon-mode MCP server
- state splits cleanly across:
  - canonical repo identity and default WARP ownership (`git common
    dir`)
  - live worktree identity (resolved worktree root)
  - session-local cache, budget, receipts, and saved state
- one repo-scoped WARP instance per canonical repo remains the default
  assumption even if several daemon sessions or worktrees bind into that
  repo

This split is the bridge from repo-local stdio to a same-user local
daemon without pretending control-plane and multi-repo concerns are
already solved.

## Multi-repo coordination contract

The current daemon can now be described lawfully in system-wide terms:

- canonical repo identity is keyed by `git common dir`
- live worktree identity is keyed by resolved worktree root
- daemon session identity remains transport-scoped and session-local

The architectural rule is:

- repo-scoped truth may be coordinated system-wide
- worktree-scoped truth may be projected beneath a repo
- session-scoped truth must not silently become daemon-global state

What a future multi-repo surface may show:

- aggregate counts across repos, worktrees, sessions, and monitors
- bounded one-row-per-repo health or backlog summaries
- filtered drill-down derived from the authorization registry and
  daemon-owned runtime state

What it must not show by default:

- raw receipt bodies
- cache content
- saved state content
- runtime-log payloads
- shell-output artifacts

This keeps multi-repo coordination observational and authorization-
filtered instead of turning it into an accidental side channel or a
permission grant.

## Where to read next

If you are onboarding as a contributor:

1. Read [README.md](/Users/james/git/graft/README.md) for the product
   claim.
2. Read [docs/GUIDE.md](/Users/james/git/graft/docs/GUIDE.md) for the
   operator setup surface.
3. Read [docs/BEARING.md](/Users/james/git/graft/docs/BEARING.md) for
   current direction and readiness bars.
4. Read [METHOD.md](/Users/james/git/graft/METHOD.md) for local process.
5. Then open:
   - [server.ts](/Users/james/git/graft/src/mcp/server.ts)
   - [repo-state.ts](/Users/james/git/graft/src/mcp/repo-state.ts)
   - [evaluate.ts](/Users/james/git/graft/src/policy/evaluate.ts)
   - [indexer.ts](/Users/james/git/graft/src/warp/indexer.ts)
   - [observers.ts](/Users/james/git/graft/src/warp/observers.ts)

That sequence gives the clearest current picture of how the system
actually works.
