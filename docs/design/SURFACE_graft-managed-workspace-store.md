---
title: "Daemon-first Graft-managed workspace store"
legend: "SURFACE"
cycle: "SURFACE_graft-managed-workspace-store"
source_feedback: "multi-repo agent workflow feedback, 2026-06-18; enhance verdict, 2026-06-19"
---

# Daemon-first Graft-managed workspace store

## Hill

Graft becomes a daemon-first, multi-workspace context governor. By default it
stores Graft-owned observations, caches, document projections, and optional
durable structural tracking under Graft's own home directory instead of inside
each target repository. Current-state structural reads work across explicitly
authorized client-session roots; durable WARP history is explicit, visible, and
opt-in per workspace.

This packet is not implementation-ready until the contract-level concerns below
are approved. The router must not ship before authorization, identity, state
axes, consent, lifecycle, retention, path resolution, failure behavior, and
receipts are settled.

## Product Laws

1. **Graft never expands a client session's authorized path set.** Daemon
   operating-system readability alone is insufficient authorization. Every
   request must be evaluated against an authenticated session capability,
   allowed-root set, authorized file handle, or equivalent host-provided grant.
2. **Daemon-first is the normal posture.** The daemon resolves authorized paths
   into workspaces and lets a session operate across multiple repositories
   without restarting or manually rebinding every repository.
3. **Capability, observation, caching, and history are separate axes.** Do not
   compress record existence, persistence mode, cache availability, exclusion,
   and durable history into one enum.
4. **Current-state reads do not require durable history.** `safe_read`,
   `file_outline`, `read_range`, current-snapshot `graft_map`, and document
   projections can run from filesystem, parser, cache, or projection facts
   without initializing WARP history.
5. **History requires real consent.** Features that need durable WARP
   structural history must require a host-confirmed approval, approval token, or
   preconfigured user policy. An agent-followable `nextCall` is not consent.
6. **Graft-managed storage is the default.** Target repositories are not
   mutated by default. Repo-local `.graft` storage remains an explicit
   portable/team mode and requires stronger approval.
7. **Receipts are multi-axis.** Responses identify runtime, workspace, fact
   source, history state, persistence mode, cache status, and policy decision.
8. **Hard policy and hook guidance are separate.** Banned-file, secret,
   symlink, and authorization rules are non-negotiable policy. Advisory,
   balanced, strict, and hook-lockdown are guidance/enforcement postures for
   instrumented client operations, not an operating-system sandbox.
9. **Documents are projected with honest provenance.** Text-bearing documents
   can be converted into bounded text/projection artifacts, but plain
   `pdftotext` output is text, not Markdown, unless a defined Markdown
   postprocessor creates it.

## Problem

The current repo-local posture makes Graft feel like a one-repository sandbox.
That breaks down in real agent workflows where a task spans sibling repos,
forks, generated clients, examples, vendor checkouts, or documentation repos.
If Graft can only help in the initially bound Git repo, agents learn to bypass
it and use native file reads.

Durable WARP tracking is also heavier than ordinary reading. Requiring
repo-local Graft/WARP state before an agent can benefit from `safe_read` or
`file_outline` creates unnecessary ceremony for the common case.

The correct product split is:

```text
read current authorized files safely
track durable history only when the user really opts in
```

The dangerous shortcut is treating "the daemon process can read this path" as
equivalent to "this client session is allowed to ask the daemon to read this
path." A daemon running as the user may see more of the filesystem than an
individual agent integration. Graft must not become a confused deputy.

## Security And State Contract

### Authorization boundary

Every daemon-backed request must be bound to an authenticated client session.
The request is authorized only if the resolved target falls within that
session's grant.

Minimum contract:

- Authenticate local clients and restrict the daemon socket.
- Bind every request to a client session.
- Give each session explicit allowed roots, path capabilities, approved file
  handles, or equivalent host-provided grants.
- Resolve symlinks before identity and policy decisions.
- Recheck authorization after canonicalization and immediately before opening
  the final object.
- Resolve relative paths against the request `cwd`, workspace handle, or opened
  root. Never use the daemon process's current working directory.
- Never claim equivalence with host permissions when the integration cannot
  prove those permissions.

Where a host cannot communicate path grants, valid alternatives are:

1. Run the read component inside the same sandbox as the client.
2. Use explicitly configured daemon allow-roots.
3. Have the client open the authorized file and transfer an authorized handle
   or handle-derived read stream to the daemon.

Slice 2 is blocked until this boundary is implemented or explicitly scoped to a
safe fallback.

### Orthogonal state axes

Workspace posture is described by separate fields:

```text
recordState:
  absent       # no durable workspace record exists
  observed     # metadata record exists

historyState:
  off
  active
  paused

persistenceMode:
  ephemeral
  graft-managed
  repo-local

exclusionPolicy:
  allowed
  excluded
```

Important consequences:

- `absent` is the absence of a record, not a persisted state.
- `observed` workspaces automatically support lightweight current-state
  operations when policy allows.
- "Lightweight" is a feature tier, not a state.
- `historyState: paused` preserves existing history but stops maintaining it.
- `exclusionPolicy: excluded` is stored in a global exclusion registry so Graft
  remembers the opt-out even when no workspace record exists.
- `persistenceMode: ephemeral` exists only in session memory and does not
  create durable metadata.
- "Tracking disabled" must not mean "all Graft state forbidden."

Feature availability is therefore simple:

```text
historyState != active  -> current-state features only
historyState == active  -> current-state features plus WARP history features
```

### Consent for tracking

History-only surfaces return an obstruction when history is not active. The
obstruction may propose an action, but it must not count as consent by itself.

Example obstruction:

```json
{
  "ok": false,
  "reason": "WORKSPACE_TRACKING_REQUIRED",
  "workspaceId": "ws_abc123",
  "historyState": "off",
  "availableFallbacks": [
    "safe_read",
    "file_outline",
    "read_range",
    "code_find"
  ],
  "proposedAction": {
    "tool": "workspace_enable_tracking",
    "args": {
      "workspaceId": "ws_abc123",
      "storageMode": "graft-managed"
    }
  },
  "approval": {
    "required": true,
    "scope": "enable_structural_history",
    "targetRepoMutation": false
  }
}
```

`workspace_enable_tracking` must enforce one of:

- host-confirmed tool approval;
- a host-issued approval token;
- a previously configured user policy, such as an explicit auto-track
  allowlist.

The agent must not be able to manufacture the approval signal. Repo-local
tracking requires a separate approval because it mutates the target repository.
Tracking activation should record an immutable consent receipt including actor,
scope, time, storage mode, target mutation posture, and approval mechanism.

## Workspace Identity And Storage

Default storage lives under the configured Graft home, normally `~/.graft`.
Authoritative workspace directories are ID-only.

```text
~/.graft/
  daemon/
    runtime.json
    activity/
  exclusions/
    workspaces.json
  workspaces/
    <workspace-id>/
      metadata.json
      cache/
        outlines/
        documents/
      observations/
      warp.git/              # created only after tracking is enabled
```

Minimum file permissions:

```text
~/.graft       0700
managed files 0600
```

Display names and aliases live inside metadata. They do not participate in the
authoritative storage path.

### Identity algorithm

Use at least 128 bits of hash output after truncation.

Git workspace identity:

```text
hash(
  identity-version,
  "git",
  canonical worktree root,
  canonical Git common dir
)
```

Non-Git workspace identity:

```text
hash(
  identity-version,
  "directory",
  canonical workspace root
)
```

Remote URLs are metadata only. They must be credential-stripped, query-stripped,
and represented as a sanitized array, not as the first configured remote.
Changing remotes must not change the workspace ID.

Example `metadata.json`:

```json
{
  "schemaVersion": 1,
  "workspaceId": "ws_abc123",
  "displayName": "graft",
  "canonicalRoot": "/Users/james/git/graft",
  "gitCommonDir": "/Users/james/git/graft/.git",
  "sanitizedRemotes": ["git@github.com:flyingrobots/graft.git"],
  "repositoryFamilyHint": "sha256:family-hash",
  "recordState": "observed",
  "historyState": "off",
  "persistenceMode": "graft-managed",
  "exclusionPolicy": "allowed",
  "createdAt": "2026-06-18T00:00:00.000Z",
  "lastObservedAt": "2026-06-18T00:00:00.000Z",
  "lastTrackedAt": null,
  "retention": {
    "cachePolicy": "derived-content",
    "workspaceBudgetBytes": 104857600,
    "ttlDays": 30
  }
}
```

Explicit identity rules:

- Moving a checkout produces a new location identity.
- `graft workspace relink <old-id> <new-path>` can reconnect managed history.
- Two clones of the same remote are separate workspaces.
- Linked Git worktrees are separate workspaces but may share a repository-family
  hint.
- Changing remotes does not alter the workspace ID.
- Reusing the same path for an unrelated checkout requires replacement
  detection or an explicit reset.
- Nested repositories and submodules become separate workspaces.
- Arbitrary single files must not each create permanent workspaces.

## Path And Workspace Resolution

Every tool call needs an explicit request `cwd`, opened workspace handle, or
authorized root.

Resolution rules:

- Relative paths resolve against request `cwd`, never daemon `cwd`.
- A Git file resolves to its containing worktree root.
- Nested repositories and submodules form their own workspaces.
- A non-Git path resolves against an explicit opened root or session root.
- Symlinks resolve before identity and policy decisions.
- The final opened object must still match the authorized canonical path.
- A successful operation, not merely a malformed request, creates an
  observation record.
- Low-value non-Git observations may remain ephemeral until repeated use,
  explicit opening, or tracking activation promotes them.
- `.graftignore` and user exclusions apply to Git and non-Git workspaces. For
  non-Git workspaces, lookup starts at the opened root and does not walk above
  the authorized root.

## Lifecycle Operations

Ambiguous verbs are avoided.

| Operation | Meaning |
|---|---|
| `track` | Create and maintain durable WARP history. |
| `pause` | Stop maintaining history but preserve existing history. |
| `resume` | Resume a paused history store. |
| `purge-history` | Irreversibly delete WARP history. |
| `forget` | Delete Graft-managed metadata, caches, and history; future reads may observe it again. |
| `exclude` | Persistently prevent new managed observations/tracking for the workspace. |
| `prune` | Remove eligible stale cache and untracked records according to policy. |
| `relink` | Attach a managed workspace record/history to a moved checkout. |

`untrack` is intentionally not a primary operation because it hides whether the
user means pause, purge, forget, or exclude.

Lifecycle commands should accept either a path or workspace ID where possible.
Destructive commands must accept workspace IDs because a deleted, moved, or
forgotten path may no longer resolve.

`prune` rules:

- Default to dry-run or summarize actions before changing state.
- Never delete active or paused WARP history by default.
- Require explicit flags and approval to remove tracked history.
- Distinguish Graft-managed deletion from repo-local target mutation.
- Never silently delete repo-local data from the target repository.

## Data Retention And Privacy

"Not writing into the repository" does not mean "no persistence." Graft-managed
state may contain source-derived metadata, converted document text, hashes,
paths, timestamps, and activity records.

Defaults:

- Do not cache raw read payloads by default.
- Cache derived outlines and document projections only after policy allows the
  source file.
- Keep the activity ledger metadata-only by default.
- Apply `.graftignore`, bans, and session authorization before fresh reads and
  before cache hits.
- Never serve a cached artifact if current policy would reject the source path.
- Strip credentials, query parameters, tokens, and fragments from remote URLs.
- Hard-ignore repo-local `.graft` from ordinary source indexing to prevent
  recursion.
- Do not silently place document caches or source copies into team-shared
  repo-local storage.
- Rate-limit `lastObservedAt` updates instead of writing metadata on every read.
- Enforce per-workspace and global storage budgets before activity ledgers or
  conversion caches can grow without bound.
- Provide inspection and clearing surfaces for metadata, caches, observations,
  document projections, and history.

Recommended cache policies:

| Policy | Meaning |
|---|---|
| `metadata-only` | Store identity, posture, and minimal activity metadata only. |
| `derived-content` | Store outlines and bounded projections after policy allows them. |
| `no-store` | Use ephemeral facts only; write no durable cache artifacts. |

Sensitive-file no-store behavior is mandatory even when the workspace cache
policy would otherwise allow derived content.

## Daemon Behavior And Failure Modes

The daemon is the normal workspace router, but daemon-first must not mean
daemon-fragile.

Nominal request flow:

1. Tool receives a path plus request `cwd`, workspace handle, or authorized
   root.
2. Request is bound to an authenticated client session.
3. Path is canonicalized and checked against the session grant.
4. Daemon resolves the canonical target to a workspace identity.
5. If durable observation is allowed and no record exists, the daemon creates an
   `observed` record in Graft-managed storage.
6. Current-state reads run from filesystem, parser, cache, or projection facts.
7. History-backed tools require active tracking and real approval if tracking
   must be enabled.

Failure behavior:

| Failure | Current-state tools | History tools |
|---|---|---|
| Daemon unavailable | May fall back in-process when policy permits; receipt says `runtime: "in-process-fallback"` and `persistenceMode: "ephemeral"`. | Fail clearly. |
| Incompatible daemon protocol | Fail or fall back only if the operation is policy-equivalent. | Fail clearly. |
| Unwritable `GRAFT_HOME` | May use ephemeral reads with explicit receipt. | Fail unless existing usable history is available without writes. |
| Corrupt metadata | Quarantine or refuse that workspace; do not guess. | Fail clearly. |
| Converter failure | Return projection failure with bounded diagnostics. | Not applicable unless history needs projection facts. |
| Concurrent CLI/daemon writes | Use single-writer lock and atomic replacement. | Use single-writer lock and atomic replacement. |
| Daemon restart during request | Retry idempotent reads when safe; otherwise fail clearly. | Fail or retry only with history consistency proof. |

Advisory and balanced hooks generally fail open with a warning. Strict and
hook-lockdown behavior must be configurable as fail-open or fail-closed.

Repo-local sandbox remains available as an explicit mode:

```text
graft serve --runtime repo-local --sandbox
```

The default setup should prefer daemon-backed serving:

```text
graft serve --runtime daemon
```

Changing the behavior of bare `graft serve` is staged:

1. generated setup defaults to daemon;
2. docs call daemon the normal mode;
3. bare `graft serve` flips only after compatibility telemetry and notices.

## Receipts

Lightweight observation, daemon cache, and Graft-managed tracking are not
mutually exclusive. Receipts should expose the relevant axes.

Example read receipt:

```json
{
  "workspace": {
    "id": "ws_abc123",
    "root": "/Users/james/git/graft"
  },
  "runtime": "daemon",
  "factSource": "filesystem",
  "historyState": "off",
  "persistenceMode": "graft-managed",
  "cache": {
    "status": "miss",
    "sourceSha256": "source-hash"
  },
  "policy": {
    "decision": "allowed",
    "rule": "bounded-source-read"
  }
}
```

Fact sources:

| Source | Meaning |
|---|---|
| `filesystem` | Fresh current-state read from the authorized path. |
| `daemon-cache` | Cached derived fact whose source is still policy-allowed. |
| `warp-history` | Durable structural history fact. |
| `document-projection` | Bounded document conversion/projection artifact. |

`graft_map` should distinguish current-snapshot output from historical map
output in either naming or receipt fields.

## Hook Behavior

Hook policy has two layers:

| Layer | Purpose |
|---|---|
| Hard policy | Session authorization, symlink checks, secrets, banned files, generated outputs, recursion bans, and current ignore rules. |
| Guidance mode | How strongly hooks steer instrumented clients toward Graft reads. |

Guidance modes:

| Mode | Behavior |
|---|---|
| `off` | No hook guidance. Hard policy may still run where the integration requires it. |
| `advisory` | No guidance-level blocking. Contextual reminders only. |
| `balanced` | Blocks expensive native reads that have safe Graft alternatives, subject to configured policy. |
| `strict` | Forces most source reads through Graft unless clearly small or allowlisted. |
| `hook-lockdown` | Blocks native reads in instrumented clients except allowlisted paths/extensions. Not an OS sandbox. |

Graft reminders must be contextual and rate-limited, for example once per
session/workspace/threshold, not injected after every harmless native read.

## Document Projection

PDFs and other text-bearing documents should become projected documents, not
generic binary refusals.

Initial document pipeline:

```text
source document
  -> authorize and apply bans/ignore policy
  -> hash source bytes
  -> convert to bounded text or a named projection format
  -> cache converted artifact under workspace cache when policy permits
  -> apply normal Graft context policy to the projection
  -> return converted content, page map, or document outline
```

Example response:

```json
{
  "projection": "document_outline",
  "sourceFormat": "pdf",
  "convertedFormat": "text",
  "cacheHit": true,
  "pages": 42,
  "conversion": {
    "sourceSha256": "source-hash",
    "artifactSha256": "text-hash",
    "converter": "pdftotext",
    "textCoverage": "partial",
    "layoutConfidence": "low",
    "warnings": ["image-only pages detected", "reading order may be inaccurate"]
  }
}
```

Document conversion must respect file bans, `.graftignore`, authorization,
cache clearing, process limits, memory limits, time limits, and output-size
limits. OCR and active embedded content are explicitly out of scope for the
first document slice. Page markers should preserve reliable page provenance
where the converter can provide it.

## Public Surfaces

Candidate CLI:

```text
graft daemon status
graft doctor
graft protocol-version
graft workspaces list
graft workspace status <path-or-workspace-id>
graft workspace explain <path>
graft workspace explain-last
graft workspace track-plan <path-or-workspace-id>
graft workspace track <path-or-workspace-id> [--storage graft-managed|repo-local]
graft workspace pause <path-or-workspace-id>
graft workspace resume <path-or-workspace-id>
graft workspace purge-history <workspace-id>
graft workspace forget <path-or-workspace-id>
graft workspace exclude <path-or-workspace-id>
graft workspace prune [--older-than 30d] [--dry-run]
graft workspace relink <old-workspace-id> <new-path>
```

Candidate MCP tools:

```text
workspace_tracking_status
workspace_track_plan
workspace_enable_tracking
workspace_pause_tracking
workspace_resume_tracking
workspace_purge_history
workspace_forget
workspace_exclude
workspace_prune
workspace_explain
```

Existing surfaces should grow multi-axis posture fields before new tools are
fully required:

- `workspace_status`
- `workspace_open`
- `workspace_list_opened`
- receipts for read-oriented tools
- tracking-required obstructions

## Acceptance Criteria

- A daemon-readable but session-unauthorized path is refused.
- Relative paths resolve against request `cwd`, never daemon `cwd`.
- Symlinks cannot bypass bans or authorized-root policy.
- A remote URL change does not change the workspace ID.
- Two same-basename repositories get different IDs.
- A daemon restart preserves the same ID.
- A safe read creates no `.graft`, no `warp.git`, and no application-level
  target-tree modifications.
- An unwritable managed store still permits an ephemeral safe read when policy
  allows fallback.
- Tracking obstruction creates no history state.
- Tracking cannot be enabled without an approval signal.
- Repo-local tracking requires stronger approval than Graft-managed tracking.
- `forget` allows later re-observation, while `exclude` prevents it.
- Default pruning never deletes active or paused history.
- A deleted, moved, or forgotten workspace can be managed using its workspace
  ID.
- Cache hits reapply current authorization, ignore, and file-ban rules.
- Concurrent first observation produces one valid workspace record.
- Metadata updates use atomic replacement and a single-writer lock.
- Current-state receipts include workspace, runtime, fact source, history state,
  persistence mode, cache status, and policy decision.
- Plain `pdftotext` output is reported as text, not Markdown.
- Docs clearly distinguish host permissions, Graft authorization, Graft read
  policy, persistence, and durable tracking opt-in.

## Playback Questions

### Human

- [ ] Can an agent use Graft naturally across two sibling repos without first
      installing `.graft` state into the second repo?
- [ ] Is it clear which state is private Graft-managed state versus repo-local
      portable state?
- [ ] Does Graft avoid pretending to be a universal sandbox while still
      governing the reads it brokers?
- [ ] Is it clear that daemon readability is not the same as client-session
      authorization?
- [ ] Is tracking consent something the human/host grants, not something an
      eager agent can auto-follow?

### Agent

- [ ] Does workspace identity remain stable and collision-resistant when two
      repos share the same basename?
- [ ] Does changing remote URLs leave the workspace ID unchanged?
- [ ] Does a safe read in an untracked workspace create only authorized
      Graft-managed metadata/cache state and no target-tree mutation?
- [ ] Does a history-only tool ask for tracking with an approval-required
      obstruction and create no history state?
- [ ] Can a workspace be forgotten, excluded, pruned, purged, or relinked with
      unambiguous deletion semantics?
- [ ] Do cache hits reapply the current authorization, ignore, and ban policy?
- [ ] Does an unwritable managed store fall back to explicit ephemeral posture
      rather than lying about persistence?

## Non-goals

- [ ] Do not make Graft a global filesystem permission system.
- [ ] Do not treat daemon OS readability as client authorization.
- [ ] Do not initialize WARP tracking merely because a file was read.
- [ ] Do not let an agent auto-follow a proposed action and call that user
      consent.
- [ ] Do not require target repos to contain `.graft` by default.
- [ ] Do not implement document projection before the document-projection
      slice.
- [ ] Do not flip bare `graft serve` behavior without compatibility staging.
- [ ] Do not solve cross-workspace semantic symbol references in this slice.
- [ ] Do not create durable workspace records for every random temporary file
      or directory.
- [ ] Do not label plain converter text as Markdown.

## Slice Plan

### Slice 0 — Security and state contract

Freeze authorization, identity, state axes, tracking consent, lifecycle
semantics, retention defaults, path resolution, daemon failure behavior, and
receipt structure. This packet is the Slice 0 design artifact. No router work
starts until Slice 0 is approved.

### Slice 1 — Workspace registry

Add ID-only storage paths, metadata schema, exclusion registry, status/list,
atomic writes, permissions, sanitized remote metadata, and deterministic
workspace identity. Safe reads still use existing execution paths.

### Slice 2 — Daemon routing and lightweight reads

Blocked until Slice 0. Route authorized absolute or outside-current-workspace
paths through daemon workspace resolution, creating observed records only after
successful operations. Include session capabilities, root resolution, receipts,
and in-process ephemeral fallback.

### Slice 3 — Tracking controls and obstructions

Combine tracking-required obstructions with user-facing lifecycle controls:
track, pause, resume, purge-history, forget, exclude, prune, and relink.
Tracking activation must enforce approval and record consent receipts.

### Slice 4 — Hook modes

Separate hard policy from guidance strictness. Add `advisory`, `balanced`,
`strict`, and `hook-lockdown` modes, define outage behavior, and rate-limit
native-read reminders.

### Slice 5 — Document projection

Add sandboxed document conversion, accurate format provenance, page mapping,
cache limits, confidence/warning fields, and failure states.

### Slice 6 — Default-command transition

Move bare `graft serve` only after compatibility telemetry, generated config
updates, notices, and a rollback story.

## Should/Could Decisions

Folded from SHOULD:

- Hard policy and guidance mode are split.
- Graft reminders are contextual and rate-limited.
- `lockdown` is renamed to `hook-lockdown` and scoped to instrumented client
  operations.
- `graft daemon status`, `graft doctor`, and `graft protocol-version` are
  candidate surfaces.
- `lastObservedAt` writes are rate-limited.
- Storage budgets and cache policies are part of retention.
- Status, forget, pause, purge, and related lifecycle commands accept path or
  workspace ID where appropriate.
- Current-snapshot `graft_map` and historical map facts are distinguished in
  receipts or naming.
- Repo-local history and local conversion caches are separable.
- `.graftignore` lookup for non-Git workspaces is specified.
- The document non-goal now says document projection is not implemented before
  the document-projection slice.

Folded from COULD:

- `graft workspace explain <path>` and `graft workspace explain-last` are
  candidate diagnostic surfaces.
- `graft workspace track-plan <path-or-workspace-id>` is a candidate consent
  planning surface.
- Explicit `workspace relink` is part of lifecycle semantics.
- Per-workspace cache policies are part of retention.
- Immutable consent receipts are required for tracking activation.
- Document page markers, projection confidence, and warnings are part of the
  document-projection slice.

Deferred SHOULD/COULD items not folded:

- **Named workspace groups / project constellations.** Deferred because this is
  a grouping and navigation feature, not part of the permission, identity, or
  storage contract. It should build on stable workspace IDs rather than shape
  them.
- **Automatic moved-checkout detection and relink offers.** The packet folds in
  explicit `workspace relink`, but defers heuristics that infer moves from
  sanitized remotes and Git fingerprints. Automatic suggestions can create
  false positives and should wait until identity, replacement detection, and
  consent receipts exist.
