---
title: "Daemon-first Graft-managed workspace store"
legend: "SURFACE"
cycle: "SURFACE_graft-managed-workspace-store"
source_feedback: "multi-repo agent workflow feedback, 2026-06-18; enhance verdicts, 2026-06-19"
---

# Daemon-first Graft-managed workspace store

## Hill

Graft becomes a daemon-first, multi-workspace context governor. By default it
stores Graft-owned observations, caches, document projections, and optional
durable structural tracking under Graft's own home directory instead of inside
each target repository. Current-state structural reads work across explicitly
authorized client-session roots or authorized file handles. Durable WARP
history is explicit, visible, authorized, and opt-in per workspace.

This packet is still a Slice 0 contract. No router, registry, cache, hook,
document conversion, or tracking implementation starts until this contract is
approved.

All remaining SHOULD, COULD, and COOL IDEA items from the enhancement verdicts
are treated as Slice 0 requirements here.

## Product Laws

1. **Graft never expands a client session's authorized path set.** Daemon
   operating-system readability alone is insufficient authorization. Every
   request must be evaluated against an authenticated session capability,
   allowed-root set, authorized workspace view, authorized file handle, or
   equivalent host-provided grant.
2. **Consent and authorization are different requirements.** Consent answers
   whether the user wants durable tracking. Authorization answers whether the
   daemon may access the filesystem target now or later. Durable tracking
   requires both.
3. **Daemon-first is the normal posture.** The daemon resolves authorized paths
   into workspace views and workspaces, allowing one session to operate across
   multiple repositories without manually rebinding every repository.
4. **Capability, observation, caching, and history are separate axes.** Do not
   compress record existence, storage topology, cache availability, exclusion,
   authorization, and durable history into one enum.
5. **Current-state reads do not require durable history.** `safe_read`,
   `file_outline`, `read_range`, current-snapshot `graft_map`, and document
   projections can run from authorized filesystem, parser, cache, or projection
   facts without initializing WARP history.
6. **History requires real consent and valid read authority.** Features that
   need durable WARP structural history must require host-confirmed approval,
   an approval token, or a preconfigured user policy, plus a filesystem
   authorization model for initial and ongoing reads.
7. **Storage is per-store, not per-workspace.** The registry, cache, and WARP
   history store can live in different places. A workspace can use a
   Graft-managed registry and projection cache while using repo-local WARP
   history.
8. **Receipts are multi-axis and scoped.** Responses identify runtime,
   workspace, workspace view, incarnation, fact source, history lifecycle,
   history availability, storage stores, cache status, policy decision, and
   authorizing grant ID.
9. **Derived data inherits input visibility.** A cache, index, map, summary, or
   historical answer is not safe merely because one source path is currently
   authorized. Aggregate artifacts must be scoped, filtered by input
   provenance, or regenerated.
10. **Hard policy and hook guidance are separate.** Authorization and
    filesystem safety invariants are non-negotiable. Configurable content
    governance and hook guidance are separate layers.
11. **Documents are projected with honest provenance.** Text-bearing documents
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
track durable history only when the user consents and the daemon has authority
```

The dangerous shortcuts are:

- treating "the daemon process can read this path" as equivalent to "this
  client session may ask the daemon to read this path";
- treating a user approval click as a durable filesystem capability;
- serving aggregate cache/history artifacts created under a broader grant to a
  narrower session;
- attaching old path-derived history to a new unrelated checkout at the same
  path.

## Security And State Contract

### Authorization boundary

Every daemon-backed request must be bound to an authenticated client session.
The request is authorized only if the opened target falls within that session's
grant.

Minimum contract:

- Authenticate local clients and restrict the daemon socket.
- Bind every request to a client session.
- Give each session explicit allowed roots, path capabilities, workspace views,
  approved file handles, or equivalent host-provided grants.
- Resolve relative paths against the request `cwd`, workspace handle, workspace
  view, or opened root. Never use the daemon process's current working
  directory.
- Never claim equivalence with host permissions when the integration cannot
  prove those permissions.
- Identify the authorizing grant in receipts by opaque ID. Never expose a
  bearer capability secret.

Where a host cannot communicate path grants, valid alternatives are:

1. Run the read component inside the same sandbox as the client.
2. Use explicitly configured daemon allow-roots.
3. Have the client open the authorized file and transfer an authorized handle
   or handle-derived read stream to the daemon.

Slice 2 is blocked until this boundary is implemented or explicitly scoped to a
safe fallback.

### Control-plane authorization

Management and diagnostic operations can leak workspace history even when they
do not read source files. They require their own capabilities.

Required control-plane capabilities:

| Capability | Allows |
|---|---|
| `workspace-read` | Read status for workspaces intersecting the session grant. |
| `workspace-manage-cache` | Clear or prune cache for authorized workspaces. |
| `workspace-manage-history` | Pause, resume, purge, or relink authorized history stores. |
| `workspace-mutate-target` | Mutate repo-local `.graft` or target repository state. |
| `registry-list` | List registry entries visible to this session. |
| `registry-admin` | Administer all local registry entries. |

Required posture:

- Trusted local owner CLI may receive `registry-admin`.
- MCP and agent sessions see only workspaces and workspace views intersecting
  their grants.
- Destructive tools require both management authorization and explicit approval.
- A tracking approval does not authorize listing, pruning, or deleting unrelated
  workspace records.
- `workspace_list_opened`, `workspace_status`, `workspace_explain`,
  `workspace_prune`, and `workspace_forget` must apply control-plane
  authorization before returning data.

### Hard policy layers

Hard policy is split into three layers:

| Layer | Meaning |
|---|---|
| Authorization and filesystem safety | Root/view grants, opened-object safety, symlink containment, special-file refusal, storage integrity. |
| Configurable content governance | Generated artifacts, build outputs, large files, vendor paths, size budgets, `.graftignore`. |
| Hook guidance | Client-facing nudges or blocks that steer reads toward Graft. |

Generated artifacts are not in the same category as escaping an authorized
root. The first layer is invariant; the second layer is configurable policy;
the third layer is integration behavior.

## State Axes

### Workspace record posture

Workspace record state is computed, not stored in `metadata.json`.

```text
recordState:
  absent       # no durable workspace metadata record exists
  observed     # durable workspace metadata record exists
```

`absent` cannot appear inside a nonexistent record. The presence of
`metadata.json` implies `recordState: observed`.

### Storage topology

The registry, cache, and history store are independently addressable.

```text
storage:
  registry: none | memory | graft-managed
  cache: none | memory | graft-managed
  history: none | graft-managed | repo-local
```

Examples:

```json
{
  "storage": {
    "registry": "graft-managed",
    "cache": "graft-managed",
    "history": "none"
  }
}
```

```json
{
  "storage": {
    "registry": "graft-managed",
    "cache": "graft-managed",
    "history": "repo-local"
  }
}
```

Consequences:

- Ephemeral current-state reads use `registry: "memory"` or `registry: "none"`
  and `cache: "memory"` or `cache: "none"`.
- Repo-local portable history does not imply repo-local registry or repo-local
  projection cache.
- Graft-managed caches must not be silently copied into repo-local team-shared
  storage.
- Repo-local `.graft` contents are untrusted repository input until validated.

### Exclusion posture

Exclusion is stored in a global exclusion registry. It is not duplicated in
workspace metadata.

```text
exclusionStatus:
  allowed
  excluded
```

`exclude` means:

- prohibit durable observation, durable cache writes, and tracking;
- permit explicitly authorized current-state reads in ephemeral/no-store mode.

If Graft needs to refuse a workspace entirely, that is a separate deny policy,
not `exclude`.

`include` removes an exclusion entry. After include, the workspace is `absent`
until a successful operation observes it again.

### History lifecycle and availability

History has lifecycle, availability, and coverage watermark fields.

```text
history:
  lifecycle: off | active | paused
  availability: none | readable | unavailable | corrupt
  watermark:
    observedAt: timestamp
    commit: optional
    sequence: optional
```

Required behavior:

| Lifecycle | Availability | Result |
|---|---|---|
| `off` | `none` | Return `WORKSPACE_TRACKING_REQUIRED` for history-only tools. |
| `active` | `readable` | Historical queries are allowed and maintenance continues. |
| `paused` | `readable` | Historical queries are allowed with a frozen/stale watermark. |
| `active` | `unavailable` | Return `HISTORY_UNAVAILABLE`, not tracking-required. |
| any | `corrupt` | Quarantine and return a specific corruption error. |

Paused history is frozen history, not nonexistent history. Historical answers
must include enough watermark information for agents to know whether the answer
covers the current commit, an older commit, or only a prior daemon observation.
`lastTrackedAt` alone is not sufficient.

### Normative state transitions

```text
off       -- track + authorization + approval --> active
active    -- pause                            --> paused
paused    -- resume + valid authorization     --> active
active    -- authorization revoked            --> paused
paused    -- purge-history + approval         --> off
any       -- forget                           --> absent
any       -- exclude                          --> absent + exclusion entry
excluded  -- include                          --> absent
```

Additional transition rules:

- Authorization expiration or revocation pauses maintenance automatically.
- `purge-history` removes WARP history but does not itself exclude future
  observation.
- `forget` for Graft-managed state leaves no durable workspace record by
  default. If an audit tombstone is retained, the operation must be named and
  documented as tombstone-retaining, not "full forget."
- `exclude` records the opt-out in the global exclusion registry and removes
  durable managed observation state.

## Tracking Consent And Authorization

### Tracking-required obstruction

History-only surfaces return an obstruction when history lifecycle is `off` or
when tracking must be enabled. The obstruction may propose an action, but it
must not count as consent by itself.

Example obstruction:

```json
{
  "ok": false,
  "reason": "WORKSPACE_TRACKING_REQUIRED",
  "workspaceId": "ws_abc123",
  "workspaceViewId": "wv_docs",
  "incarnationId": "wi_current",
  "history": {
    "lifecycle": "off",
    "availability": "none"
  },
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
      "workspaceViewId": "wv_docs",
      "storage": {
        "history": "graft-managed"
      }
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
tracking requires separate stronger approval because it mutates or depends on
the target repository.

### Durable tracking authorization

Consent is not enough for ongoing maintenance. Continuous daemon maintenance
must have a current or durable filesystem grant.

```text
trackingAuthorization:
  mode: session-bound | durable-grant
  grantId: optional
  scopeDigest: string
  expiresAt: optional
  revocationEpoch: optional
```

Rules:

- Session-bound tracking updates history only during authorized sessions.
- Durable-grant tracking may maintain history between sessions.
- Grant expiration or revocation pauses maintenance automatically.
- Consent and authorization are both required.
- An approval token must not double as a filesystem capability unless the host
  explicitly designed it to do both.
- Repo-local mode requires stronger consent and an authorized write capability
  for the target repository.
- Never persist raw bearer capability tokens in workspace metadata.
- Approval tokens are scoped to workspace ID, workspace view ID, incarnation ID,
  storage target, and consent scope.

Tracking activation records an immutable consent receipt including actor, scope,
time, storage mode, target mutation posture, maintenance mode, read scope,
write targets, and approval mechanism.

### Tracking plan

`workspace track-plan` is required before tracking activation surfaces. It must
make consent informed, not ceremonial.

Example:

```json
{
  "workspace": "ws_abc123",
  "workspaceView": "wv_repo",
  "incarnation": "wi_current",
  "maintenanceMode": "session-bound",
  "readScope": "/repo",
  "writeTargets": ["~/.graft/workspaces/ws_abc123/warp.git"],
  "targetRepoMutation": false,
  "estimatedInitialFiles": 482,
  "estimatedInitialBytes": 18399221,
  "ignoredCategories": ["build", "vendor"],
  "retentionPolicy": "derived-content"
}
```

## Workspace Views, Identity, And Storage

### Workspace and view IDs

Two identities are required:

```text
workspaceId      # physical checkout/location identity
workspaceViewId  # checkout constrained to a particular authorized root/scope
```

A workspace view prevents a `/repo/docs` session from inheriting `/repo/src`
facts through cache or history artifacts generated by a broader session.

Workspace view identity is derived from:

- workspace ID;
- canonical authorized root or host-provided scope ID;
- normalized include/exclude scope;
- authorization epoch where the host provides one;
- policy version that affects visible inputs.

### Capability epochs

Host grants may carry a monotonically changing authorization epoch.
Cache and aggregate artifacts record the epoch and scope under which they were
produced. Revocation or scope narrowing invalidates artifacts from older or
broader epochs unless they can be safely filtered by input provenance.

### Workspace identity algorithm

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
token-stripped, fragment-stripped, and represented as a sanitized array.
Changing remotes must not change the workspace ID.

Do not collect `repositoryFamilyHint` in v1 unless a shipped feature uses it.
Speculative identity metadata can become sensitive and stale.

Explicit identity rules:

- Moving a checkout produces a new location identity.
- `graft workspace relink <old-id> <new-path>` can reconnect managed history
  after validation and approval.
- Two clones of the same remote are separate workspaces.
- Linked Git worktrees are separate workspaces.
- Access to a linked worktree's external Git common directory requires a
  separate grant.
- Changing remotes does not alter the workspace ID.
- Nested repositories and submodules become separate workspaces only when
  discovery is authorized.
- Arbitrary single files must not each create permanent workspaces.
- Bare Git repositories are out of scope for Slice 1 unless a separate identity
  contract is approved.

### History store identity

Portable repo-local history needs its own identity:

```text
historyStoreId  # durable WARP store identity
```

A path-derived `workspaceId` must not become the authoritative identity
embedded in a portable, team-shared `.graft` store. A repo-local store should
have its own UUID or manifest identity and be mapped to each developer's local
workspace.

### Storage layout

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
      incarnations/
        <incarnation-id>.json
      views/
        <workspace-view-id>.json
      cache/
        outlines/
        documents/
        maps/
      observations/
      warp.git/              # only for graft-managed history
```

Minimum storage safety:

```text
~/.graft       0700
managed files 0600
```

Storage creation must verify ownership, use restrictive umask/ACLs, create
directories securely, and refuse to follow symlinked storage components.

Example `metadata.json`:

```json
{
  "schemaVersion": 1,
  "workspaceId": "ws_abc123",
  "displayName": "graft",
  "canonicalRoot": "/Users/james/git/graft",
  "gitCommonDir": "/Users/james/git/graft/.git",
  "sanitizedRemotes": ["git@github.com:flyingrobots/graft.git"],
  "incarnationId": "wi_current",
  "historyStoreId": null,
  "storage": {
    "registry": "graft-managed",
    "cache": "graft-managed",
    "history": "none"
  },
  "history": {
    "lifecycle": "off",
    "availability": "none",
    "watermark": null
  },
  "trackingAuthorization": null,
  "createdAt": "2026-06-18T00:00:00.000Z",
  "lastObservedAt": "2026-06-18T00:00:00.000Z",
  "retention": {
    "cachePolicy": "derived-content",
    "workspaceBudgetBytes": 104857600,
    "ttlDays": 30
  }
}
```

`metadata.json` does not contain `recordState` or `exclusionPolicy`; those are
computed from record existence and the global exclusion registry.

### Incarnation and replacement detection

Because `workspaceId` is location-derived, the same path can later contain an
unrelated checkout. Graft needs a separate local incarnation identity:

```text
workspaceId    # deterministic location identity
incarnationId  # generated identity for observed contents at that location
```

Replacement evidence can include platform file identity for the root and Git
common directory plus conservative repository fingerprints. These are detection
hints, not authoritative workspace identity.

On a strong mismatch:

```json
{
  "ok": false,
  "reason": "WORKSPACE_REPLACED",
  "workspaceId": "ws_abc123",
  "previousIncarnationId": "wi_old",
  "observedIncarnationId": "wi_new"
}
```

Required behavior:

- Quarantine old caches and history.
- Never automatically attach old WARP history.
- Require explicit reset, replacement acceptance, or validated relink.
- Scope approval tokens to workspace ID, workspace view ID, and incarnation ID.
- Do not merge merely because sanitized remotes match.

## Path Opening, Repository Discovery, And Observation

### Race-safe opening

The object read must be opened through an authorized root handle or equivalent
race-resistant platform mechanism, with traversal constrained beneath that
root. Authorization is validated against the opened object, not merely an
earlier pathname resolution.

Implementation may use platform-appropriate mechanisms such as
directory-handle-relative traversal and no-follow/beneath-root constraints.

Required behavior:

- Reject FIFOs, device nodes, sockets, and other special files by default.
- Apply bounded-read rules before potentially blocking file types.
- Do not follow magic links or proc-like indirections.
- Verify the final object type after opening.
- Prevent traversal outside the root even when intermediate components change.
- Document platform-specific guarantees where exact equivalence is impossible.
- Resolve relative paths against request `cwd`, opened root, workspace view, or
  workspace handle. Never use daemon `cwd`.

### Repository discovery stays inside the grant

Repository discovery never walks above the authorized root unless the grant
explicitly includes metadata discovery above it.

Rules:

- A Git file resolves to its containing worktree root only when discovery to
  that root is authorized.
- A subdirectory grant may produce a scoped workspace view.
- A file-handle-only grant may remain an ephemeral file operation with no
  repository discovery.
- Access to a linked worktree's external Git common directory requires a
  separate grant.
- Nested repositories and submodules are discovered only within authorized
  roots.

### Deterministic observation promotion

Observation promotion has deterministic v1 rules:

| Input posture | Durable registration |
|---|---|
| Git workspace under an authorized workspace-root grant | Register after first successful operation unless excluded or no-store. |
| Explicitly opened non-Git root | Register after first successful operation unless excluded or no-store. |
| Ad hoc file or file-handle operation | Remain ephemeral unless the host explicitly opens a workspace root. |

Observation leases and heuristic promotion are later optimizations, not hidden
Slice 2 policy.

## Cache And History Visibility

Rechecking authorization before a cache hit is necessary but not sufficient.
Aggregate artifacts must not leak facts from a broader session to a narrower
one.

Every derived artifact needs input-level provenance:

```json
{
  "inputs": [
    {
      "workspaceRelativePath": "src/example.ts",
      "snapshot": {
        "fileIdentity": "opaque-platform-id",
        "size": 1234,
        "mtimeNs": 123456789,
        "sha256": null
      }
    }
  ],
  "scope": {
    "root": "src/",
    "recursive": true
  },
  "transform": {
    "name": "tree-sitter-outline",
    "version": "1.2.3"
  }
}
```

The contract requires one of:

- Cache artifacts are scoped to the authorization view that generated them.
- Aggregate artifacts contain path-level provenance and are filtered before
  returning.
- Artifacts are regenerated when safe filtering is impossible.

This applies to:

- workspace maps;
- code indexes;
- symbol timelines;
- dead-symbol history;
- historical deleted paths;
- activity summaries;
- document bundles.

For historical files that no longer exist, authorization is evaluated against
an authorized workspace root plus a normalized historical workspace-relative
path. Current filesystem canonicalization cannot authorize a deleted path.

Cache keys include:

- source snapshot;
- parser/converter version;
- relevant policy version;
- configuration;
- projection options;
- workspace view ID or equivalent authorization scope;
- capability epoch where available.

Content hashes are optional. A full cryptographic hash appears only when the
complete source was already authorized and consumed, conversion or cache
integrity genuinely requires it, and the file passed size and type limits.

## Lifecycle Operations

Ambiguous verbs are avoided.

| Operation | Meaning |
|---|---|
| `track` | Create and maintain durable WARP history after consent and authorization. |
| `pause` | Stop maintaining history but preserve readable existing history. |
| `resume` | Resume paused history maintenance with valid authorization. |
| `purge-history` | Irreversibly delete WARP history after explicit approval. |
| `forget` | Delete Graft-managed registry, cache, and managed history for a workspace. |
| `exclude` | Prevent durable observation, durable cache, and tracking; allow ephemeral current-state reads. |
| `include` | Remove an exclusion entry so future successful operations may observe again. |
| `prune` | Plan or apply removal of eligible stale cache and untracked records according to policy. |
| `relink` | Attach a managed workspace record/history to a moved checkout after validation. |

`untrack` is intentionally not a primary operation because it hides whether the
user means pause, purge, forget, or exclude.

Lifecycle commands accept either a path or workspace ID where possible.
Destructive commands must accept workspace IDs because a deleted or moved path
may no longer resolve.

### Forget

Default `forget` semantics:

- Delete Graft-managed registry, cache, and managed history for the workspace.
- Do not mutate repo-local `.graft`.
- Leave no durable workspace record unless the user selected an explicit
  tombstone-retaining audit mode.

Removing repo-local state requires an explicit destructive flag or separate
operation with write authorization and stronger approval.

A deleted or moved workspace with an existing managed record can be managed
using its workspace ID. A fully forgotten workspace cannot be managed by ID
unless an explicit tombstone was retained.

### Prune

`prune` is plan-only by default:

```text
graft workspace prune          # plan only
graft workspace prune --apply  # mutate
```

Rules:

- Never delete active or paused WARP history by default.
- Require explicit flags and approval to remove tracked history.
- Distinguish Graft-managed deletion from repo-local target mutation.
- Never silently delete repo-local data from the target repository.
- Show workspace IDs, incarnation IDs, storage stores, and affected byte counts
  in the plan.

### Relink

`relink` must:

- validate old history against the new incarnation;
- disclose mismatches;
- require approval;
- never merge merely because sanitized remotes match;
- explain whether it moves the managed store, creates a mapping, or changes a
  manifest.

## Data Retention And Privacy

"Not writing into the repository" does not mean "no persistence." Graft-managed
state may contain source-derived metadata, converted document text, hashes,
paths, timestamps, and activity records.

Defaults:

- Do not cache raw read payloads by default.
- Cache derived outlines and document projections only after policy allows the
  source file and the requested workspace view.
- Keep the activity ledger metadata-only by default: operation class, workspace
  ID, workspace view ID, timestamps, aggregate sizes, and coarse result status.
- Absolute file paths in the activity ledger are optional because metadata can
  still be sensitive.
- Apply authorization, `.graftignore`, bans, content governance, and session
  scope before fresh reads and before cache hits.
- Never serve a cached artifact if current policy would reject any unfiltered
  source input.
- Strip credentials, query parameters, tokens, and fragments from remote URLs.
- Hard-ignore repo-local `.graft` from ordinary source indexing to prevent
  recursion.
- Treat repo-local `.graft` contents as untrusted repository input. Validate
  schemas, sizes, object names, symlinks, and path containment before loading
  anything.
- Do not silently place document caches or source copies into team-shared
  repo-local storage.
- Rate-limit `lastObservedAt` updates instead of writing metadata on every read.
- Enforce per-workspace and global storage budgets before activity ledgers or
  conversion caches can grow without bound.
- Provide inspection and clearing surfaces for metadata, caches, observations,
  document projections, and history.
- Add schema and identity migration rules before the daemon becomes the default
  writer.

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

1. Tool receives a path plus request `cwd`, workspace handle, workspace view, or
   authorized root/file handle.
2. Request is bound to an authenticated client session.
3. Path traversal/opening occurs beneath the authorized root with race-resistant
   platform mechanisms.
4. Authorization is checked against the opened object.
5. Daemon resolves the opened target to a workspace and workspace view only
   within the authorized grant.
6. Replacement/incarnation checks run before cache or history attachment.
7. If durable observation is allowed and deterministic promotion says to
   register, the daemon creates or updates an observed record.
8. Current-state reads run from filesystem, parser, cache, or projection facts.
9. History-backed tools require readable history, tracking consent, and valid
   tracking authorization.

Failure behavior:

| Failure | Current-state tools | History tools |
|---|---|---|
| Daemon unavailable | May fall back in-process when policy permits; receipt says `runtime: "in-process-fallback"` and `storage.registry/cache: "memory"` or `"none"`. | Fail clearly. |
| Incompatible daemon protocol | Fail or fall back only if the operation is policy-equivalent. | Fail clearly. |
| Unwritable `GRAFT_HOME` | May use ephemeral reads with explicit receipt. | Fail unless existing usable history is available without writes. |
| Corrupt metadata | Quarantine or refuse that workspace; do not guess. | Return corruption error. |
| History unavailable | Current-state features continue where policy allows. | Return `HISTORY_UNAVAILABLE`. |
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
mutually exclusive. Receipts expose the relevant axes.

Example read receipt:

```json
{
  "workspace": {
    "id": "ws_abc123",
    "root": "/Users/james/git/graft"
  },
  "workspaceView": {
    "id": "wv_docs",
    "root": "/Users/james/git/graft/docs",
    "authorizationEpoch": 7
  },
  "incarnationId": "wi_current",
  "runtime": "daemon",
  "factSource": "filesystem",
  "history": {
    "lifecycle": "off",
    "availability": "none",
    "watermark": null
  },
  "storage": {
    "registry": "graft-managed",
    "cache": "graft-managed",
    "history": "none"
  },
  "sourceSnapshot": {
    "fileIdentity": "opaque-platform-id",
    "size": 1234,
    "mtimeNs": 123456789,
    "sha256": null
  },
  "cache": {
    "status": "miss",
    "scope": "wv_docs"
  },
  "policy": {
    "decision": "allowed",
    "rule": "bounded-source-read",
    "grantId": "grant_opaque"
  }
}
```

Fact sources:

| Source | Meaning |
|---|---|
| `filesystem` | Fresh current-state read from the authorized opened object. |
| `daemon-cache` | Cached derived fact whose input provenance is still policy-allowed. |
| `warp-history` | Durable structural history fact. |
| `document-projection` | Bounded document conversion/projection artifact. |

`graft_map` distinguishes current-snapshot output from historical map output in
either naming or receipt fields.

## Hook Behavior

Guidance modes:

| Mode | Behavior |
|---|---|
| `off` | No hook guidance. Hard policy may still run where the integration requires it. |
| `advisory` | No guidance-level blocking. Contextual reminders only. |
| `balanced` | Blocks expensive native reads that have safe Graft alternatives, subject to configured policy. |
| `strict` | Forces most source reads through Graft unless clearly small or allowlisted. |
| `hook-lockdown` | Blocks native reads in instrumented clients except allowlisted paths/extensions. Not an OS sandbox. |

Graft reminders are contextual and rate-limited, for example once per session,
workspace view, or meaningful threshold. They are not injected after every
harmless native read.

## Document Projection

PDFs and other text-bearing documents should become projected documents, not
generic binary refusals.

Initial document pipeline:

```text
source document
  -> authorize and apply filesystem safety/content governance
  -> open through race-resistant path mechanism
  -> hash source bytes only if full content is authorized and needed
  -> convert to bounded text or a named projection format
  -> cache converted artifact under workspace-view cache when policy permits
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
    "artifactSha256": "text-hash",
    "converter": "pdftotext",
    "textCoverage": "partial",
    "layoutConfidence": "low",
    "warnings": ["image-only pages detected", "reading order may be inaccurate"]
  }
}
```

Document conversion must respect file bans, `.graftignore`, authorization,
cache clearing, process limits, memory limits, time limits, output-size limits,
and workspace-view visibility. OCR is out of scope for the first document
slice. Active content, external references, attachments, and network access are
never executed or fetched. Page markers preserve reliable page provenance where
the converter can provide it.

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
graft workspace track <path-or-workspace-id> [--storage-history graft-managed|repo-local]
graft workspace pause <path-or-workspace-id>
graft workspace resume <path-or-workspace-id>
graft workspace purge-history <workspace-id>
graft workspace forget <path-or-workspace-id>
graft workspace exclude <path-or-workspace-id>
graft workspace include <path-or-workspace-id>
graft workspace prune
graft workspace prune --apply
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
workspace_include
workspace_prune
workspace_explain
```

Existing surfaces grow multi-axis posture fields before new tools are fully
required:

- `workspace_status`
- `workspace_open`
- `workspace_list_opened`
- receipts for read-oriented tools
- tracking-required obstructions
- daemon status and doctor outputs

## Acceptance Criteria

- A daemon-readable but session-unauthorized path is refused.
- Control-plane operations cannot enumerate or mutate workspaces outside the
  session's grants/capabilities.
- Relative paths resolve against request `cwd`, authorized root, workspace
  view, or handle. They never resolve against daemon `cwd`.
- The opened object, not merely an earlier pathname, is authorized.
- Symlinks, magic links, and changing intermediate path components cannot
  bypass bans or authorized-root policy.
- FIFOs, device nodes, sockets, and other special files are refused by default.
- Repository discovery never walks above the authorized root without a metadata
  discovery grant.
- A subdirectory grant produces a scoped workspace view rather than silently
  exposing the full repository.
- A remote URL change does not change the workspace ID.
- Two same-basename repositories get different IDs.
- A daemon restart preserves the same ID.
- A same-path replacement produces a new incarnation mismatch and quarantines
  old cache/history.
- Bare Git repositories are refused or explicitly out of scope.
- A safe read creates no target `.graft`, no `warp.git`, and no
  application-level target-tree modifications.
- An unwritable managed store still permits an ephemeral safe read when policy
  allows fallback.
- A workspace can use a Graft-managed registry/cache with repo-local history.
- Repo-local history has a `historyStoreId` distinct from local `workspaceId`.
- `metadata.json` does not store `recordState` or `exclusionPolicy`.
- Tracking obstruction creates no history state.
- Tracking cannot be enabled without an approval signal and valid read
  authorization.
- Durable maintenance pauses when tracking authorization expires or is revoked.
- Repo-local tracking requires stronger approval and target write
  authorization.
- `paused` history remains readable with stale/frozen watermark receipts.
- Unavailable active history returns `HISTORY_UNAVAILABLE`, not
  `WORKSPACE_TRACKING_REQUIRED`.
- `forget` allows later re-observation only after durable state is removed; it
  does not mutate repo-local `.graft` by default.
- `exclude` prevents durable observation/tracking while still allowing
  authorized ephemeral reads.
- `include` removes exclusion and returns the workspace to absent posture.
- Default pruning is plan-only and never deletes active or paused history.
- A deleted or moved workspace with an existing managed record can be managed
  using its workspace ID.
- Cache hits reapply current authorization, ignore, content governance, and
  file-ban rules.
- A narrow workspace view cannot receive aggregate cache/history facts created
  by a broader view unless safely filtered by input provenance.
- Historical deleted paths are authorized by workspace-relative historical path
  under an authorized root, not by current filesystem canonicalization.
- Concurrent first observation produces one valid workspace record.
- Metadata updates use atomic replacement and a single-writer lock.
- Current-state receipts include workspace, workspace view, incarnation,
  runtime, fact source, history lifecycle/availability/watermark, storage,
  cache status, policy decision, and opaque grant ID.
- Normal read receipts do not compute full source SHA-256 unless the full file
  was already authorized and consumed and size/type limits permit it.
- Plain `pdftotext` output is reported as text, not Markdown.
- Document active content, external references, attachments, and network access
  are never executed or fetched.
- Schema and identity migration rules exist before the daemon becomes the
  default writer.
- Docs clearly distinguish host permissions, Graft authorization, Graft read
  policy, persistence stores, durable tracking consent, and durable tracking
  authorization.

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
- [ ] Is it clear how session-bound tracking differs from continuous tracking
      under a durable grant?
- [ ] Is it clear that a docs-only workspace view cannot inherit source-wide
      caches or history answers?
- [ ] Do lifecycle verbs make deletion, exclusion, pausing, and repo-local
      mutation consequences explicit?

### Agent

- [ ] Does workspace identity remain stable and collision-resistant when two
      repos share the same basename?
- [ ] Does changing remote URLs leave the workspace ID unchanged?
- [ ] Does a same-path repository replacement produce an incarnation mismatch
      instead of attaching old history?
- [ ] Does a safe read in an untracked workspace create only authorized
      Graft-managed metadata/cache state and no target-tree mutation?
- [ ] Does a history-only tool ask for tracking with an approval-required
      obstruction and create no history state?
- [ ] Can a workspace be forgotten, included, excluded, pruned, purged, or
      relinked with unambiguous deletion semantics?
- [ ] Do cache hits reapply the current authorization, ignore, ban, content
      governance, workspace-view, and capability-epoch policy?
- [ ] Does an unwritable managed store fall back to explicit ephemeral posture
      rather than lying about persistence?
- [ ] Do paused history answers remain readable with stale/frozen watermarks?
- [ ] Do control-plane tools hide unrelated registry entries from narrow MCP
      sessions?
- [ ] Does race-safe opening authorize the object actually read rather than a
      stale path resolution?

## Non-goals

- [ ] Do not make Graft a global filesystem permission system.
- [ ] Do not treat daemon OS readability as client authorization.
- [ ] Do not treat tracking consent as filesystem authorization.
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
- [ ] Do not support bare Git repositories in Slice 1 without a separate
      identity contract.

## Slice Plan

### Slice 0 — Security and state contract

Freeze authorization, control-plane capabilities, store topology, workspace
views, identity, incarnation detection, history lifecycle/availability,
tracking consent, tracking authorization, lifecycle semantics, retention
defaults, path opening, repository discovery, daemon failure behavior, receipt
structure, and migration rules. This packet is the Slice 0 design artifact. No
router work starts until Slice 0 is approved.

### Slice 1 — Workspace registry

Add ID-only storage paths, workspace metadata schema, incarnation records,
workspace view records, exclusion registry, include/exclude status, status/list
authorization, atomic writes, secure directory creation, permissions, sanitized
remote metadata, deterministic workspace identity, and schema/identity
migration scaffolding. Safe reads still use existing execution paths.

### Slice 2 — Daemon routing and lightweight reads

Blocked until Slice 0. Route authorized absolute or outside-current-workspace
paths through daemon workspace/view resolution. Include session capabilities,
race-safe opening, repository discovery boundaries, deterministic observation
promotion, aggregate cache scoping, receipts, and in-process ephemeral fallback.

### Slice 3A — Tracking approval, enable, pause, resume, obstruction

Ship `track-plan`, approval-required obstructions, enable tracking, pause, and
resume. Enforce tracking authorization and consent receipts. Paused history
remains readable with a frozen watermark.

### Slice 3B — Include, exclude, forget, prune

Ship include/exclude, forget, and plan-first prune semantics. Enforce
control-plane capabilities and distinguish Graft-managed deletion from
repo-local target mutation.

### Slice 3C — Purge-history, replacement handling, relink

Ship destructive history purge, same-path replacement detection, quarantine,
and explicit relink. Require approval, incarnation validation, and clear
manifest/mapping behavior.

### Slice 4 — Hook modes

Separate authorization/filesystem safety, configurable content governance, and
hook guidance. Add `advisory`, `balanced`, `strict`, and `hook-lockdown` modes,
define outage behavior, and rate-limit native-read reminders.

### Slice 5 — Document projection

Add sandboxed document conversion, accurate format provenance, page mapping,
cache limits, confidence/warning fields, active-content refusal, no-network
guarantees, and failure states.

### Slice 6 — Default-command transition

Move bare `graft serve` only after compatibility telemetry, generated config
updates, notices, migration rules, and a rollback story.

## Folded Enhancement Requirements

The following previously suggested SHOULD, COULD, and COOL IDEA items are now
normative requirements in this packet:

- Remove `repositoryFamilyHint` from v1 unless a shipped feature uses it.
- Treat repo-local `.graft` contents as untrusted repository input.
- Split hard policy into authorization/filesystem safety, configurable content
  governance, and hook guidance.
- Default the activity ledger to operation class, workspace IDs, timestamps,
  and aggregate sizes; make absolute paths optional.
- Require secure creation, ownership verification, restrictive permissions, and
  symlink refusal for Graft-home storage.
- State that document active content, external references, attachments, and
  network access are never executed or fetched.
- Add schema and identity migration rules before daemon default writing.
- Split destructive tracking/lifecycle work into Slices 3A, 3B, and 3C.
- Introduce `workspaceViewId` for authorized workspace views.
- Include capability epochs for cache invalidation when grants change.
- Strengthen `track-plan` into an informed consent surface.
- Add the normative state-transition table.
- Keep explicit `workspace relink` and require validation/approval.
- Keep document projection confidence and page provenance.

No SHOULD, COULD, or COOL IDEA item from the latest verdict is intentionally
deferred.
