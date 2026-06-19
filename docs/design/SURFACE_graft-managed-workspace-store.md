---
title: "Daemon-first Graft-managed workspace store"
legend: "SURFACE"
cycle: "SURFACE_graft-managed-workspace-store"
source_feedback: "multi-repo agent workflow feedback, 2026-06-18"
---

# Daemon-first Graft-managed workspace store

## Hill

Graft becomes a daemon-first, multi-workspace context governor. By default it
stores Graft-owned observations, caches, document conversions, and optional
durable structural tracking under Graft's own home directory instead of inside
each target repository. Safe structural reads work anywhere the agent can
already read; durable WARP tracking is explicit, visible, and opt-in per
workspace.

## Product Laws

1. **Graft is not the universal sandbox.** It must not deny a readable source
   path merely because that path is outside the current Git repository. The
   host agent/client permission model remains the outer access boundary.
2. **Daemon-first is the normal posture.** The daemon resolves paths into
   workspaces and lets a session operate across multiple repositories without
   restarting or rebinding by hand.
3. **Safe reads do not require durable tracking.** `safe_read`,
   `file_outline`, `read_range`, lightweight `graft_map`, and document
   projections can run from filesystem and parser facts.
4. **History requires explicit tracking.** Features that need durable WARP
   structural history must ask for tracking before creating or maintaining
   workspace history.
5. **Graft-managed storage is the default.** Target repos are not mutated by
   default. Repo-local `.graft` storage remains an explicit portable/team mode.
6. **Tracking posture is visible.** Responses that depend on workspace state
   identify whether their facts came from lightweight observation, daemon cache,
   repo-local tracking, or durable Graft-managed tracking.
7. **Hooks teach and enforce by mode.** Hooks can be advisory, balanced,
   strict, or lockdown; allowed native reads should still advertise Graft.
8. **Documents are projected when reasonable.** Text-bearing documents such as
   PDFs should be converted into bounded Markdown/text projections instead of
   being blindly refused as binary files.

## Problem

The current repo-local posture makes Graft feel like a one-repository sandbox.
That breaks down in real agent workflows where a task spans sibling repos,
forks, generated clients, examples, vendor checkouts, or documentation repos.
If Graft can only help in the initially bound Git repo, agents learn to bypass
it and use native file reads.

Durable WARP tracking is also heavier than ordinary reading. Requiring
repo-local Graft/WARP state before an agent can benefit from `safe_read` or
`file_outline` creates unnecessary ceremony for the common case.

Graft needs to separate two concerns:

```text
read safely anywhere the agent can already read
track durably only when the user opts in
```

## Storage Model

Default storage lives under the configured Graft home, normally `~/.graft`.

```text
~/.graft/
  daemon/
    runtime.json
    activity/
  workspaces/
    <display-name>--<workspace-id>/
      metadata.json
      cache/
        reads/
        outlines/
        documents/
      observations/
      warp.git/              # created only after tracking is enabled
```

The workspace directory name includes a human-friendly alias, but identity must
not rely on the alias. Repo basenames collide constantly.

### Workspace Identity

Workspace identity is derived from stable inspectable facts:

- canonical realpath of the worktree root;
- Git common dir, when present;
- first configured remote URL, when present;
- fallback path identity for non-Git directories.

The ID should be a deterministic hash over normalized identity components. A
workspace can also store aliases for display and migration repair.

Example `metadata.json`:

```json
{
  "schemaVersion": 1,
  "workspaceId": "ws_abc123",
  "displayName": "graft",
  "worktreeRoot": "/Users/james/git/graft",
  "gitCommonDir": "/Users/james/git/graft/.git",
  "remoteUrl": "git@github.com:flyingrobots/graft.git",
  "storageMode": "graft-managed",
  "trackingState": "lightweight",
  "createdAt": "2026-06-18T00:00:00.000Z",
  "lastObservedAt": "2026-06-18T00:00:00.000Z",
  "lastTrackedAt": null
}
```

## Tracking States

Graft should distinguish workspace visibility from durable history.

| State | Meaning | Durable Target Mutation? | WARP Available? |
|---|---|---:|---:|
| `unseen` | Daemon has never observed the path/workspace. | No | No |
| `observed` | Daemon saw activity and recorded metadata. | No | No |
| `lightweight` | Filesystem/parser reads, caches, and conversions are available. | No | No |
| `tracked` | Durable structural history is enabled. | No by default | Yes |
| `disabled` | User opted out of Graft tracking for this workspace. | No | No |

Storage modes:

| Mode | Location | Purpose |
|---|---|---|
| `graft-managed` | `~/.graft/workspaces/<id>/` | Default private local state |
| `repo-local` | `<repo>/.graft/` | Explicit portable/team-shared state |
| `ephemeral` | memory/session only | Temporary use without durable local state |
| `disabled` | none | User opt-out |

## Feature Matrix

| Feature | Observed/Lightweight | Tracked |
|---|---:|---:|
| `safe_read` | Yes | Yes |
| `file_outline` | Yes | Yes |
| `read_range` | Yes | Yes |
| document conversion/projection | Yes | Yes |
| lightweight `graft_map` | Yes | Yes |
| cross-workspace activity ledger | Yes | Yes |
| structural history | No, ask to track | Yes |
| symbol timelines | No, ask to track | Yes |
| dead-symbol history | No, ask to track | Yes |
| structural churn/blame over history | No, ask to track | Yes |

When a feature requires tracking, return a structured obstruction:

```json
{
  "ok": false,
  "reason": "WORKSPACE_TRACKING_REQUIRED",
  "trackingState": "lightweight",
  "availableFallbacks": ["safe_read", "file_outline", "read_range", "code_find"],
  "nextCall": {
    "tool": "workspace_enable_tracking",
    "args": {
      "cwd": "/Users/james/git/example",
      "storageMode": "graft-managed"
    }
  }
}
```

## Daemon Behavior

The daemon is the normal workspace router.

1. A tool receives an absolute path or repo-relative path.
2. The daemon resolves it to a workspace identity.
3. If no workspace record exists, the daemon creates an `observed` record in
   Graft-managed storage.
4. Safe reads and outlines run immediately.
5. Durable WARP-backed tools ask before enabling tracking.

Repo-local sandbox remains available as an explicit mode:

```text
graft serve --runtime repo-local --sandbox
```

The default setup should prefer daemon-backed serving:

```text
graft serve --runtime daemon
```

Changing the behavior of bare `graft serve` can be staged across releases:

1. generated setup defaults to daemon;
2. docs call daemon the normal mode;
3. bare `graft serve` flips after compatibility notice.

## Hook Behavior

Hooks need strictness modes:

| Mode | Behavior |
|---|---|
| `off` | No hook behavior |
| `advisory` | Never blocks except obvious secrets/banned files; always advertises Graft |
| `balanced` | Blocks secrets/binaries/build artifacts and large source reads; advertises Graft on allowed reads |
| `strict` | Forces source reads through Graft unless clearly small/allowed |
| `lockdown` | Blocks native reads except allowlisted paths/extensions |

Current hook behavior is too narrow: outside-cwd paths bypass governance, and
allowed native reads often get no Graft reminder. The daemon-first model should
let hooks ask the daemon to classify any readable path rather than treating
current `cwd` as the hard boundary.

## Document Projection

PDFs and other text-bearing documents should become projected documents, not
generic binary refusals.

Initial document pipeline:

```text
source document
  -> hash source bytes
  -> convert to markdown/text
  -> cache converted artifact under workspace cache
  -> apply normal Graft context policy
  -> return converted content or document outline
```

Example response:

```json
{
  "projection": "document_outline",
  "sourceFormat": "pdf",
  "convertedFormat": "markdown",
  "cacheHit": true,
  "pages": 42,
  "conversion": {
    "sourceSha256": "source-hash",
    "artifactSha256": "markdown-hash",
    "converter": "pdftotext"
  }
}
```

Document conversion must respect file bans, `.graftignore`, size limits, and
cache clearing. OCR and active embedded content are explicitly out of scope for
the first document slice.

## Public Surfaces

Candidate CLI:

```text
graft workspaces list
graft workspace status <path>
graft workspace track <path> [--storage graft-managed|repo-local]
graft workspace untrack <path>
graft workspace forget <path>
graft workspace prune [--older-than 30d]
```

Candidate MCP tools:

```text
workspace_tracking_status
workspace_enable_tracking
workspace_disable_tracking
workspace_forget
workspace_prune
```

Existing surfaces should grow tracking posture fields before new tools are
fully required:

- `workspace_status`
- `workspace_open`
- `workspace_list_opened`
- receipts for read-oriented tools
- tracking-required obstructions

## Acceptance Criteria

- A readable path in another Git repo can be opened/read through daemon-backed
  Graft without writing to that target repo.
- The daemon creates or updates a Graft-managed workspace metadata record under
  the configured Graft home.
- Workspace IDs are deterministic and collision-resistant for repos with the
  same basename.
- Safe structural reads work in `observed`/`lightweight` state.
- WARP/history-dependent features return `WORKSPACE_TRACKING_REQUIRED` with a
  `nextCall`, rather than silently initializing tracking.
- Users can inspect, forget, and prune Graft-managed workspace state.
- Docs clearly distinguish host permissions, Graft read policy, and durable
  tracking opt-in.

## Playback Questions

### Human

- [ ] Can an agent use Graft naturally across two sibling repos without first
      installing `.graft` state into the second repo?
- [ ] Is it clear which state is private Graft-managed state versus repo-local
      portable state?
- [ ] Does Graft avoid pretending to be a universal sandbox while still
      governing the reads it brokers?

### Agent

- [ ] Does workspace identity remain stable and collision-resistant when two
      repos share the same basename?
- [ ] Does a safe read in an untracked workspace create only Graft-managed
      metadata/cache state?
- [ ] Does a history-only tool ask for tracking with a machine-readable
      `nextCall`?
- [ ] Can a workspace be forgotten or pruned without touching the target repo?

## Non-goals

- [ ] Do not make Graft a global filesystem permission system.
- [ ] Do not initialize WARP tracking merely because a file was read.
- [ ] Do not require target repos to contain `.graft` by default.
- [ ] Do not implement PDF/document conversion in the workspace-store slice.
- [ ] Do not flip bare `graft serve` behavior without compatibility staging.
- [ ] Do not solve cross-workspace semantic symbol references in this slice.

## Slice Plan

### Slice 1 — Graft-managed workspace metadata

Add deterministic workspace IDs, metadata records, tracking states, and
workspace status/list surfaces backed by the daemon `graftDir`. Safe reads
still use existing execution paths.

### Slice 2 — Daemon auto-open for readable paths

Route absolute or outside-current-workspace paths through daemon workspace
resolution, creating `observed`/`lightweight` records without target repo
mutation.

### Slice 3 — Tracking-required obstructions

Make WARP/history-only surfaces return `WORKSPACE_TRACKING_REQUIRED` with
fallbacks and `nextCall` when workspace tracking is not enabled.

### Slice 4 — Hook strictness modes

Add `advisory`, `balanced`, `strict`, and `lockdown` read-hook modes. Always
advertise Graft on allowed native reads, with stronger messages for expensive
reads.

### Slice 5 — Tracking enable/disable/forget/prune

Add user-facing controls for enabling tracking, disabling tracking, forgetting
workspace state, and pruning stale Graft-managed stores.

### Slice 6 — Document projection cache

Add PDF-to-Markdown/text conversion cache and document projections under the
workspace store.
