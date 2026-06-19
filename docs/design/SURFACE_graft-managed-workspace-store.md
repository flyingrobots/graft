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
authorized client-session roots, authorized workspace-view handles with a
current valid visibility context, opened roots, or authorized file handles.
Durable structural history is explicit, scoped, visible, authorized, and opt-in
through history bindings.

This packet is still a Slice 0 contract. No router, registry, cache, hook,
document conversion, or tracking implementation starts until this contract is
approved.

All SHOULD, COULD, and COOL IDEA items from the enhancement verdicts are
treated as Slice 0 requirements here.

## Product Laws

1. **Graft never expands a client session's authorized path set.** Daemon
   operating-system readability alone is insufficient authorization. Every
   request must be evaluated against an authenticated session capability,
   allowed-root set, authorized file handle, or an authorized workspace-view
   handle whose current visibility context is backed by a valid host-provided
   grant.
2. **Consent and authorization are different requirements.** Consent answers
   whether the user wants durable tracking or destructive maintenance.
   Authorization answers whether the daemon may access or mutate the target now
   or later. Durable tracking and destructive operations require both.
3. **History belongs to a tracking scope, not to the workspace.** A workspace
   may have docs-only managed history, full-source managed history, and
   repo-local portable history at the same time. Lifecycle, availability,
   watermark, consent, and tracking authorization live on history bindings.
4. **Daemon-first is the normal posture.** The daemon resolves authorized
   operations into resource scopes, workspace views, workspaces, incarnations,
   and history bindings without manually rebinding every repository.
5. **Capability, observation, caching, and history are separate axes.** Do not
   compress record existence, storage topology, cache availability, exclusion,
   authorization, tracking scope, and durable history into one enum.
6. **Current-state reads do not require durable history.** `safe_read`,
   `file_outline`, `read_range`, current-snapshot `graft_map`, and document
   projections can run from authorized filesystem, parser, cache, or projection
   facts without initializing durable structural history.
7. **Storage is per-store, not per-workspace.** The registry, cache, and each
   history binding's provider store can live in different places.
8. **A workspace view is stable visibility, not a transient grant.**
   `workspaceViewId` alone confers no authority. A workspace view becomes
   usable only through a current valid `visibilityContext`. Grant ID, grant
   epoch, policy digest, and session ID never define durable `workspaceViewId`.
   They belong in a visibility context.
9. **Receipts describe a resource scope.** Some operations have no workspace.
   File-handle-only and opened-root operations must not invent fake workspaces
   to satisfy a receipt schema.
10. **Derived data inherits input visibility and truth constraints.** A cache,
    index, map, summary, or historical answer is not safe merely because one
    path is currently authorized. Aggregate artifacts must be scoped, filtered
    by input provenance, or regenerated. Filtered historical conclusions must
    preserve truth as well as secrecy.
11. **Hard policy and hook guidance are separate.** Authorization and
    filesystem safety invariants are non-negotiable. Configurable content
    governance and hook guidance are separate layers.
12. **Documents are projected with honest provenance.** Text-bearing documents
    can be converted into bounded text/projection artifacts, but plain
    `pdftotext` output is text, not Markdown, unless a defined Markdown
    postprocessor creates it.

## Problem

The current repo-local posture makes Graft feel like a one-repository sandbox.
That breaks down in real agent workflows where a task spans sibling repos,
forks, generated clients, examples, vendor checkouts, or documentation repos.
If Graft can only help in the initially bound Git repo, agents learn to bypass
it and use native file reads.

Durable structural-history tracking is heavier than ordinary reading. Requiring
repo-local Graft/provider state before an agent can benefit from `safe_read` or
`file_outline` creates unnecessary ceremony for the common case.

The correct product split is:

```text
read current authorized files safely
track durable history only when a scoped plan is approved and authorized
```

The dangerous shortcuts are:

- treating "the daemon process can read this path" as equivalent to "this
  client session may ask the daemon to read this path";
- treating user approval as a durable filesystem capability;
- modeling history as a singular workspace property when tracking is scoped;
- serving aggregate cache/history artifacts created under a broader grant to a
  narrower session;
- attaching old path-derived history to a new unrelated checkout at the same
  path;
- calling an exclusion operation "non-destructive" while silently deleting the
  state it excludes.

## Security And State Contract

### Authorization boundary

Every daemon-backed request must be bound to an authenticated client session.
The request is authorized only if the opened target falls within that session's
grant.

Minimum contract:

- Authenticate local clients and restrict the daemon socket.
- Bind every request to a client session.
- Give each session explicit allowed roots, path capabilities, approved file
  handles, authorized workspace-view handles with current visibility context,
  or equivalent host-provided grants.
- Resolve relative paths against the request `cwd`, workspace handle,
  authorized workspace-view handle, opened root, or opened file object. Never
  use the daemon process's current working directory.
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

### Resource-scoped control plane

Management and diagnostic operations can leak workspace history even when they
do not read source files. They require resource-scoped capabilities, not global
boolean verbs.

Example capability:

```json
{
  "capability": "workspace-manage-history",
  "resource": {
    "historyBindingIds": ["hb_docs"]
  },
  "actions": ["pause", "resume"]
}
```

Required control-plane capabilities:

| Capability | Allows |
|---|---|
| `workspace-read` | Read status for resources intersecting the session grant, subject to redaction. |
| `workspace-manage-cache` | Clear or prune cache artifacts fully within the authorized view. |
| `workspace-manage-history` | Pause, resume, purge, or relink exact authorized history bindings/stores. |
| `workspace-mutate-target` | Mutate repo-local `.graft` or target repository state. |
| `registry-list` | List registry entries visible to this session. |
| `registry-admin` | Administer all local registry entries. |

Rules:

- Trusted local owner CLI may receive `registry-admin`.
- MCP and agent sessions see only resources intersecting their grants.
- Intersection is sufficient only for filtered status/query operations.
- Cache clearing applies only to artifacts fully within the authorized view.
- Purge requires authority over the exact binding/store.
- Relink requires authority over both old and new bindings/workspaces.
- Whole-workspace forget requires full workspace authority or `registry-admin`.
- Registry-wide prune without a workspace selector requires `registry-admin`.
- Target mutation additionally requires `workspace-mutate-target`.
- A tracking approval does not authorize listing, pruning, or deleting unrelated
  workspace records.
- `workspace_list_opened`, `workspace_status`, `workspace_explain`,
  `workspace_prune`, `workspace_forget`, and `workspace_explain_operation`
  apply control-plane authorization before returning data.

### Hard policy layers

Hard policy is split into three layers:

| Layer | Meaning |
|---|---|
| Authorization and filesystem safety | Root/view grants, opened-object safety, symlink containment, mount policy, special-file refusal, storage integrity. |
| Configurable content governance | Generated artifacts, build outputs, large files, vendor paths, size budgets, `.graftignore`. |
| Hook guidance | Client-facing nudges or blocks that steer reads toward Graft. |

Generated artifacts are not in the same category as escaping an authorized
root. The first layer is invariant; the second layer is configurable policy;
the third layer is integration behavior.

## Resource Scopes

Not every authorized operation resolves to a workspace.

Workspace-view resource:

```json
{
  "resourceScope": {
    "kind": "workspace-view",
    "workspaceId": "ws_abc123",
    "workspaceViewId": "wv_docs"
  }
}
```

Opened-root resource:

```json
{
  "resourceScope": {
    "kind": "opened-root",
    "rootId": "root_123"
  }
}
```

File-object resource:

```json
{
  "resourceScope": {
    "kind": "file-object",
    "objectId": "object_opaque"
  }
}
```

For object-only operations:

```text
workspaceId: absent
workspaceViewId: absent
incarnationId: absent
registry storage: none | memory
```

Graft must not invent a fake workspace merely to satisfy a receipt schema.

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

The registry, cache, and history stores are independently addressable.

```text
storage:
  registry: none | memory | graft-managed
  cache: none | memory | graft-managed
  history: none | graft-managed | repo-local   # stored per history binding
```

Example workspace registry/cache storage:

```json
{
  "storage": {
    "registry": "graft-managed",
    "cache": "graft-managed"
  }
}
```

Example history binding storage:

```json
{
  "storage": "repo-local"
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

### Exclusion, preservation, and deletion

Exclusion is policy. Forgetting is deletion. They are separate operations.

Exclusion is stored in a global exclusion registry. It is not duplicated in
workspace metadata.

For v1, exclusion targets the workspace location. A same-path replacement
remains excluded until explicitly included.

```text
exclusionStatus:
  allowed
  excluded
```

`exclude` means:

- add an exclusion policy;
- stop and fence background maintenance;
- pause active tracking bindings;
- prohibit ordinary durable cache/history use and new writes;
- preserve existing managed state.

`include` means:

- remove the exclusion policy;
- do not automatically resume paused tracking;
- leave preserved state available only through normal authorization and
  lifecycle rules.

`forget` means:

- delete Graft-managed workspace records, caches, and managed histories;
- do not change exclusion policy unless explicitly requested.

An excluded-and-forgotten location remains manageable through its exclusion
entry because policy records are deliberately separate from workspace records.

If Graft needs to refuse a workspace entirely, that is a separate deny policy,
not `exclude`.

### Normative state transitions

```text
allowed + active
  -- exclude -->
excluded + paused + preserved state

excluded + paused
  -- include -->
allowed + paused + preserved state

observed
  -- forget -->
absent

excluded + observed
  -- forget -->
excluded + absent
```

History-binding transitions:

```text
absent binding -- track + authorization + approval --> active binding
active         -- pause                            --> paused
paused         -- resume + valid authorization     --> active
active         -- authorization revoked            --> paused
active|paused  -- purge-history + approval         --> absent binding
```

Additional transition rules:

- Authorization expiration or revocation pauses maintenance automatically.
- `purge-history` removes structural-history state for a binding but does not
  itself exclude future observation.
- `forget` for Graft-managed state leaves no durable workspace record by
  default. If an audit tombstone is retained, the operation must be named and
  documented as tombstone-retaining, not "full forget."
- `exclude` does not delete workspace records, cache artifacts, consent
  receipts, or history stores. It fences and pauses them.

## History Bindings

### Substrate boundary

Durable structural history sits behind a Graft-owned port and adapter boundary.
The workspace registry does not depend on git-warp's graph shape, repository
layout, observer model, or storage semantics.

The primary target substrate is Echo-native structural history after the Echo
integration gate is cleared. git-warp remains a provenance-preserving import
source and temporary fallback adapter:

```text
StructuralHistoryPort
  -> EchoStructuralHistoryAdapter          # primary after integration gate
  -> GitWarpImportedHistoryAdapter         # import provenance
  -> GitWarpFallbackHistoryAdapter         # compatibility while parity closes
```

Normative rules:

- Workspace records store binding IDs and substrate-neutral metadata only.
- History bindings declare provider/evidence posture without importing provider
  internals into workspace metadata.
- Echo-native facts use `echo-native` evidence only after a real Echo runtime,
  retained-evidence posture, and package compatibility surface are proven.
- git-warp facts are labeled `git-warp-imported` after import or
  `fallback-translated` while served through compatibility paths.
- No Slice 1 registry code may open git-warp or assume a `warp.git` path.
- Provider-specific storage is owned by the adapter behind the binding record.

### Binding model

Tracking scope is a first-class entity. A history binding connects workspace,
incarnation, logical tracking scope, physical history store, lifecycle,
authorization, and consent.

Example:

```json
{
  "historyBindingId": "hb_docs",
  "historyStoreId": "hs_123",
  "workspaceId": "ws_abc123",
  "incarnationId": "wi_current",
  "trackingScopeId": "ts_docs",
  "scope": {
    "root": "docs/",
    "include": ["**/*"],
    "exclude": ["generated/**"]
  },
  "storage": "graft-managed",
  "provider": {
    "kind": "echo-native | git-warp-imported | fallback-translated",
    "adapter": "echo | git-warp-import | git-warp-fallback"
  },
  "lifecycle": "active",
  "availability": "readable",
  "watermark": {
    "observedAt": "2026-06-19T00:00:00.000Z",
    "commit": "abc123"
  },
  "trackingAuthorizationRef": "ta_456",
  "consentReceiptId": "cr_789"
}
```

Workspace metadata contains references only:

```json
{
  "historyBindingIds": ["hb_docs"]
}
```

These fields do not appear as singular workspace metadata fields:

- `historyStoreId`
- `history`
- `trackingAuthorization`

Recommended v1 rule:

```text
one logical history binding = one physical history store
```

Sharing one physical provider store among differently scoped bindings can come
later, after strict partitioning is proven.

Repo-local compatibility history initially requires a full-worktree tracking
scope. A partial docs-only repo-local `.graft` history is portable confusion
and is out of v1.

### History lifecycle and availability

History lifecycle and availability live on each history binding.

```text
history binding:
  lifecycle: active | paused
  availability: none | readable | unavailable | corrupt
  watermark:
    observedAt: timestamp
    commit: optional
    sequence: optional
```

Valid combinations:

| Lifecycle | Valid availability |
|---|---|
| `active` | `readable`, `unavailable` |
| `paused` | `readable`, `unavailable`, `corrupt` |

Behavior:

| Lifecycle | Availability | Result |
|---|---|---|
| no binding | `none` | Return `WORKSPACE_TRACKING_REQUIRED` for history-only tools. |
| `active` | `readable` | Historical queries are allowed and maintenance continues. |
| `paused` | `readable` | Historical queries are allowed with a frozen/stale watermark. |
| `active` | `unavailable` | Return `HISTORY_UNAVAILABLE`, not tracking-required. |
| any | `corrupt` | Quarantine and return a specific corruption error. |

On corruption:

```text
active + corrupt -> paused + corrupt
```

Paused history is frozen history, not nonexistent history. Historical answers
include enough watermark information for agents to know whether the answer
covers the current commit, an older commit, or only a prior daemon observation.
`lastTrackedAt` alone is not sufficient.

### Query rules and completeness

A request view may query a history binding only when:

- its requested scope is contained by the tracked scope; or
- the result can be safely restricted to the intersection.

History output reports:

```text
scopeCompleteness:
  complete
  partial
  insufficient
```

Some claims cannot be meaningfully filtered. A docs-only view cannot safely
receive a repository-wide "dead symbol" conclusion with hidden paths removed.
Such tools return `INSUFFICIENT_SCOPE` rather than a confidently wrong answer.

Tracking-scope expansion requires a new plan and approval. It never happens
merely because a broader session arrives later.

### Historical rename boundaries

For each historical event:

- authorize the path as it existed at that event;
- apply the request view and current deny/content policy;
- truncate rename/copy lineage when it crosses outside the authorized scope;
- do not reveal the hidden former/new path;
- do not disclose hidden counts through "N omitted" metadata;
- mark the resulting timeline partial where appropriate.

Example:

```text
src/private.ts -> docs/example.ts
```

A docs-only view may see history beginning when the file entered `docs/`. It
must not follow the lineage backward into `src/` unless separately authorized.

## Scope Algebra

Workspace views, tracking scopes, cache scopes, and management scopes use one
normalized scope algebra. Uncertainty is a first-class security result.

Required operations:

```text
relation(a, b):
  equivalent
  contains
  contained-by
  overlaps
  disjoint
  unknown

subtract(a, b):
  ScopeSet
  unknown
```

`subtract` may produce multiple disjoint scopes. Exact containment or
subtraction over arbitrary include/exclude languages can be limited in v1 to
root-prefix and other provably comparable scopes. More expressive patterns
return `unknown` rather than optimistic authorization.

Normative handling:

| Consumer | `unknown` behavior |
|---|---|
| Authorization | Deny. |
| Management authority | Deny. |
| Cache reuse | Treat as miss; regenerate if authorized. |
| History query | Return `INSUFFICIENT_SCOPE`. |
| Scope expansion | Require a new explicit plan. |
| Historical filtering | Truncate or refuse; never guess. |

Scope path normalization:

- workspace-relative only;
- canonical separator;
- no absolute paths;
- no `.` or `..` segments;
- no NUL;
- explicit case-sensitivity semantics;
- explicit Unicode/byte-path semantics;
- deterministic include/exclude rule ordering.

This shared algebra governs:

- cache reuse;
- history visibility;
- management authority;
- tracking-scope expansion;
- historical rename truncation;
- `scopeCompleteness`;
- `INSUFFICIENT_SCOPE` decisions.

## Tracking Consent, Plans, And Authorization

### Tracking-required obstruction

History-only surfaces return an obstruction when no usable history binding is
available. The obstruction may propose an action, but it does not count as
consent by itself.

Example obstruction:

```json
{
  "ok": false,
  "reason": "WORKSPACE_TRACKING_REQUIRED",
  "resourceScope": {
    "kind": "workspace-view",
    "workspaceId": "ws_abc123",
    "workspaceViewId": "wv_docs"
  },
  "incarnationId": "wi_current",
  "availableFallbacks": [
    "safe_read",
    "file_outline",
    "read_range",
    "code_find"
  ],
  "proposedAction": {
    "tool": "workspace_plan_operation",
    "args": {
      "operation": "track",
      "workspaceId": "ws_abc123",
      "workspaceViewId": "wv_docs",
      "trackingScopeId": "ts_docs",
      "historyStorage": "graft-managed"
    }
  },
  "approval": {
    "required": true,
    "scope": "enable_structural_history",
    "targetRepoMutation": false
  }
}
```

### Generic plan/commit protocol

Approval binds to an immutable plan. Graft uses a generic plan/commit protocol
instead of bespoke approval machinery per operation.

Candidate tools:

```text
workspace_plan_operation
workspace_commit_operation
```

The plan returns:

```json
{
  "planId": "tp_123",
  "planDigest": "sha256:...",
  "expiresAt": "2026-06-19T01:00:00.000Z",
  "operation": "track",
  "preconditions": {
    "workspaceId": "ws_abc123",
    "incarnationId": "wi_current",
    "trackingScopeId": "ts_docs",
    "grantEpoch": 7,
    "historyStorage": "graft-managed",
    "maintenanceMode": "session-bound"
  },
  "effects": {
    "writeTargets": ["~/.graft/workspaces/ws_abc123/history/hb_docs/provider"],
    "targetRepoMutation": false,
    "retainedArtifacts": []
  },
  "approval": {
    "scope": "enable_structural_history",
    "audience": "graft-daemon"
  }
}
```

Approval binds to:

- plan digest;
- operation;
- workspace and incarnation;
- tracking scope;
- physical history target;
- target mutation posture;
- maintenance mode;
- exact write targets;
- expiry and daemon/host audience.

Activation revalidates all preconditions. Material change returns
`OPERATION_PLAN_STALE`. Approval tokens are replay-resistant and preferably
single-use.

The same plan/commit pattern covers:

- Graft-managed tracking;
- repo-local tracking;
- purge-history;
- destructive prune;
- relink;
- target-repository deletion;
- forget operations that retain or delete audit material.

### Tracking authorization

Consent is not enough for ongoing maintenance. Continuous daemon maintenance
must have a current or durable filesystem grant.

```text
trackingAuthorization:
  trackingAuthorizationId: string
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
  tracking scope, storage target, and consent scope.

Tracking activation records an append-only consent receipt while retained.
"Immutable" means unmodifiable while retained, not necessarily undeletable
forever.

Destructive plans disclose residual records:

```json
{
  "residualRecords": [
    {
      "kind": "consent-audit",
      "retentionDays": 90,
      "containsAbsolutePaths": false
    }
  ]
}
```

A purported full forget must not leave undisclosed workspace-linked audit data.

### Crash-consistent mutation semantics

Tracking activation and destructive operations touch multiple related objects.
A single-file atomic replace is not enough.

Required fields/mechanisms:

```text
operationId
idempotency key
prepare/commit journal
startup reconciliation
generation fencing
```

Required invariants:

- No active binding exists without a valid consent receipt and initialized
  store.
- No background job runs after exclude, forget, purge, replacement quarantine,
  or grant revocation.
- Purge pauses and fences maintenance before deleting history.
- Retried operations cannot create duplicate stores or receipts.
- Startup repairs or quarantines prepared-but-uncommitted state.
- Metadata never points to a partially initialized history store.

## Workspace Views, Identity, And Storage

### Stable workspace view identity

Workspace view identity is stable visibility:

```text
workspaceViewId = hash(
  view-schema-version,
  workspaceId,
  normalized stable scope descriptor
)
```

Do not include these in durable `workspaceViewId`:

- authorization epoch;
- policy version;
- grant ID;
- session ID.

Transient authorization and policy data live in `visibilityContext`:

```json
{
  "visibilityContext": {
    "grantId": "grant_opaque",
    "grantEpoch": 7,
    "scopeDigest": "sha256:...",
    "policyDigest": "sha256:..."
  }
}
```

Use `visibilityContext` for:

- cache validation;
- artifact provenance;
- authorization rechecks;
- receipts;
- approval preconditions.

A host-provided scope ID may participate in `workspaceViewId` only when it is
stable, non-secret, and semantically identifies the scope, not merely the
current grant instance.

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

Compute the Git workspace identity only when all required identity inputs are
authorized.

Remote URLs are metadata only. They must be credential-stripped, query-stripped,
token-stripped, fragment-stripped, and represented as a sanitized array.
Changing remotes must not change the workspace ID.

Do not collect `repositoryFamilyHint` in v1 unless a shipped feature uses it.
Speculative identity metadata can become sensitive and stale.

### Identity encoding

The identity encoding is part of the contract.

Freeze:

- canonical serialization format;
- length-prefixing or structured encoding;
- platform and volume namespace;
- case-sensitivity behavior;
- Unicode normalization posture;
- identity-version migration;
- whether IDs are local or portable.

Recommended v1:

```text
workspaceId is installation-local
historyStoreId is portable
```

This matches their jobs: a workspace is a local location identity; a
history store can be portable repo-local state.

### Workspace resolution outcomes

Path and handle resolution produces one of four outcomes:

```text
host-declared-workspace
authorized-discovered-git-workspace
scoped-directory-workspace
object-only-operation
```

Rules:

- Compute normal Git workspace identity only when all identity inputs are
  authorized.
- A docs-only grant that cannot discover the repository root becomes a scoped
  directory workspace.
- A file-handle-only request remains object-only.
- A host may supply an authenticated workspace handle that binds the limited
  view to a known workspace without authorizing daemon discovery.
- An existing registry entry must not reveal an unauthorized parent repository
  unless the session has corresponding control-plane capability.
- A linked worktree without access to its external common directory must not
  pretend it has computed the normal Git identity.
- A later broader grant may offer an explicit merge/rebind operation.
- Graft never silently merges a scoped-directory workspace into a newly
  discovered Git workspace.
- Bare Git repositories are out of scope for Slice 1 unless a separate identity
  contract is approved.

### History store identity

Portable repo-local history has its own identity:

```text
historyStoreId  # durable provider-store identity
```

A path-derived `workspaceId` must not become the authoritative identity
embedded in a portable, team-shared `.graft` store. A repo-local store has its
own UUID or manifest identity and is mapped to each developer's local workspace
through explicit binding records.

`historyStoreId` from a repo-local manifest is an untrusted claim, not
authority. Never merge or attach stores merely because claimed IDs match.

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
  operations/
    <operation-id>.json
  consent/
    <consent-receipt-id>.json
  workspaces/
    <workspace-id>/
      metadata.json
      incarnations/
        <incarnation-id>/
          metadata.json
          cache/
            outlines/
            documents/
            maps/
      views/
        <workspace-view-id>.json
      history-bindings/
        <history-binding-id>.json
      observations/
      history/
        <history-binding-id>/
          provider/          # adapter-owned, never interpreted by registry
```

Minimum storage safety:

```text
~/.graft       0700
managed files 0600
```

Storage creation verifies ownership, uses restrictive umask/ACLs, creates
directories securely, and refuses to follow symlinked storage components.

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
  "historyBindingIds": ["hb_docs"],
  "storage": {
    "registry": "graft-managed",
    "cache": "graft-managed"
  },
  "createdAt": "2026-06-18T00:00:00.000Z",
  "lastObservedAt": "2026-06-18T00:00:00.000Z",
  "retention": {
    "cachePolicy": "derived-content",
    "workspaceBudgetBytes": 104857600,
    "ttlDays": 30
  }
}
```

`metadata.json` does not contain `recordState`, `exclusionPolicy`,
`historyStoreId`, singular `history`, or singular `trackingAuthorization`.

### Incarnation and replacement detection

Because `workspaceId` is location-derived, the same path can later contain an
unrelated checkout. Graft needs a separate local incarnation identity:

```text
workspaceId    # deterministic location identity
incarnationId  # generated identity for observed contents at that location
```

No heuristic can guarantee every same-path repository replacement without a
durable marker in the target. Replacement detection is honest about confidence.

```text
incarnationStatus:
  confirmed
  suspect
  replaced
  unknown
```

Behavior:

| Status | Cache/history attachment |
|---|---|
| `confirmed` | Allowed subject to policy. |
| `suspect` | Block durable attachment; allow authorized ephemeral current-state operations. |
| `replaced` | Quarantine old state and create a new incarnation. |
| `unknown` | Block durable attachment until validated. |

On strong mismatch:

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

- Strong same-path replacement signals produce incarnation mismatch.
- Weak, missing, or conflicting evidence produces `suspect` or `unknown`.
- Old cache/history is not attached unless the incarnation is confirmed.
- Quarantine old caches and history on `replaced`.
- Never automatically attach old structural history.
- Require explicit reset, replacement acceptance, or validated relink.
- Scope approval tokens to workspace ID, workspace view ID, incarnation ID, and
  tracking scope.
- Do not merge merely because sanitized remotes match.

## Path Opening, Repository Discovery, And Snapshots

### Cross-platform path-safety floor

The object read must be opened through an authorized root handle or equivalent
race-resistant platform mechanism, with traversal constrained beneath that
root. Authorization is validated against the opened object, not merely an
earlier pathname resolution.

If the platform cannot enforce required containment, Graft does not silently
downgrade to best-effort path traversal. It must:

1. require a pre-opened authorized handle;
2. use an in-sandbox implementation; or
3. reject that path-based operation.

Grant fields:

```text
pathTraversal:
  symlinks: deny
  magicLinks: deny
  mountCrossing: deny | allow
  reparsePoints: deny | allowlisted
```

Required behavior:

- Reject FIFOs, device nodes, sockets, and other special files by default.
- Apply bounded-read rules before potentially blocking file types.
- Do not follow magic links or proc-like indirections.
- Verify the final object type after opening.
- Prevent traversal outside the root even when intermediate components change.
- Enforce mount-boundary policy for descendant mounts, bind mounts, and
  reparse-based mount points.
- Linux implementations may use explicit beneath/in-root, magic-link, and
  mount-crossing controls.
- Windows implementations must handle junctions and reparse points explicitly.
- Platforms lacking required path primitives must use handles, in-sandbox
  execution, or rejection.
- Resolve relative paths against request `cwd`, opened root, workspace view, or
  workspace handle. Never use daemon `cwd`.

Acceptance coverage must include bind-mounted directories beneath an authorized
root, filesystem mount crossings, Windows junctions/reparse points, roots moved
or replaced during traversal, and platforms lacking required path primitives.

### Repository discovery stays inside the grant

Repository discovery never walks above the authorized root unless the grant
explicitly includes metadata discovery above it.

Rules:

- A Git file resolves to its containing worktree root only when discovery to
  that root is authorized.
- A subdirectory grant may produce a scoped workspace view or scoped-directory
  workspace.
- A file-handle-only grant remains object-only unless the host supplies a
  workspace handle.
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

### Coherent source snapshots

Parser and cache facts come from coherent reads.

Requirements:

- Read through one opened handle.
- Capture metadata before and after.
- Retry or mark unstable if the file changed during parsing.
- Never cache an unstable result.
- Include a directory-enumeration watermark for multi-file maps.

A hash of bytes read does not prove the file was stable throughout a concurrent
rewrite.

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
        "sha256": null,
        "stability": "stable"
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

- Cache artifacts are scoped to the stable workspace view that generated them
  and validated through current `visibilityContext`.
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
- relevant policy digest;
- configuration;
- projection options;
- stable workspace view ID or equivalent scope;
- visibility context digest;
- capability epoch where available.

Content hashes are optional. A full cryptographic hash appears only when the
complete source was already authorized and consumed, conversion or cache
integrity genuinely requires it, and the file passed size and type limits.

## Lifecycle Operations

Ambiguous verbs are avoided.

| Operation | Meaning |
|---|---|
| `track` | Create and maintain a history binding after consent and authorization. |
| `pause` | Stop maintaining a history binding but preserve readable existing history. |
| `resume` | Resume paused history maintenance with valid authorization. |
| `purge-history` | Irreversibly delete structural history for an exact binding/store after explicit approval. |
| `forget` | Delete Graft-managed registry, cache, and managed histories as planned; does not change exclusion policy by default. |
| `exclude` | Add exclusion policy, fence maintenance, pause bindings, and preserve state. |
| `include` | Remove exclusion policy; does not automatically resume tracking. |
| `prune` | Plan or apply removal of eligible stale cache and untracked records according to policy. |
| `relink` | Attach a managed workspace record/history to a moved checkout after validation. |

`untrack` is intentionally not a primary operation because it hides whether the
user means pause, purge, forget, or exclude.

Lifecycle commands accept either a path or relevant resource ID where possible.
Destructive commands must accept stable IDs because a deleted or moved path may
no longer resolve.

### Forget

Default `forget` semantics:

- Delete Graft-managed registry, cache, and managed history selected by the
  approved plan.
- Do not mutate repo-local `.graft`.
- Do not change exclusion policy unless the plan explicitly includes it.
- Leave no durable workspace record unless the user selected an explicit
  tombstone-retaining audit mode.

Removing repo-local state requires an explicit destructive plan with write
authorization and stronger approval.

A deleted or moved workspace with an existing managed record can be managed
using its workspace ID. A fully forgotten workspace can still be affected by
separate policy records, such as a location-level exclusion entry.

### Prune

`prune` is plan-only by default:

```text
graft workspace prune          # plan only
graft workspace prune --apply  # mutate
```

Rules:

- Never delete active or paused structural history by default.
- Require explicit flags, exact resource authority, and approval to remove
  tracked history.
- Distinguish Graft-managed deletion from repo-local target mutation.
- Never silently delete repo-local data from the target repository.
- Show workspace IDs, workspace view IDs, incarnation IDs, history binding IDs,
  history store IDs, storage stores, and affected byte counts in the plan.

### Relink

`relink` must:

- validate old history against the new incarnation;
- disclose mismatches;
- require approval;
- never merge merely because sanitized remotes match;
- explain whether it moves the managed store, creates a mapping, or changes a
  manifest;
- require authority over both old and new resources.

## Repo-local WARP Safety

Repo-local `.graft` and WARP state are untrusted repository input.

Normative restrictions:

- Validate schemas, sizes, object names, symlinks, and path containment before
  loading anything.
- Do not honor object alternates or HTTP alternates.
- Do not follow configuration includes outside the validated store.
- Never execute hooks, fsmonitor commands, filters, textconv, external diffs,
  editors, pagers, credential helpers, or remote helpers.
- Sanitize Git-related environment variables.
- Prohibit network fetches.
- Bound object sizes, decompression, tree depth, ref counts, and traversal.
- Treat `historyStoreId` from a repo-local manifest as an untrusted claim, not
  authority.
- Never merge or attach stores merely because their claimed IDs match.

Graft must not invoke ordinary Git tooling against repo-local WARP state with
ambient config and environment.

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
- Apply authorization, `.graftignore`, bans, content governance, session scope,
  workspace view, and capability epoch before fresh reads and before cache
  hits.
- Never serve a cached artifact if current policy would reject any unfiltered
  source input.
- Strip credentials, query parameters, tokens, and fragments from remote URLs.
- Hard-ignore repo-local `.graft` from ordinary source indexing to prevent
  recursion.
- Do not silently place document caches or source copies into team-shared
  repo-local storage.
- Rate-limit `lastObservedAt` updates instead of writing metadata on every read.
- Enforce per-workspace, per-view, and global storage budgets before activity
  ledgers or conversion caches can grow without bound.
- Provide inspection and clearing surfaces for metadata, caches, observations,
  document projections, history bindings, consent receipts, and operation
  journals.
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

1. Tool receives a path plus request `cwd`, workspace handle, workspace view,
   authorized root/file handle, or object handle.
2. Request is bound to an authenticated client session.
3. Path traversal/opening occurs beneath the authorized root with
   race-resistant platform mechanisms, or the operation uses an authorized
   handle/in-sandbox fallback.
4. Authorization is checked against the opened object.
5. Daemon resolves the opened target to a resource scope and, where permitted,
   a workspace and workspace view.
6. Replacement/incarnation checks run before cache or history attachment.
7. If durable observation is allowed and deterministic promotion says to
   register, the daemon creates or updates an observed record.
8. Current-state reads run from filesystem, parser, cache, or projection facts.
9. History-backed tools select an authorized history binding and report scope
   completeness.

Failure behavior:

| Failure | Current-state tools | History tools |
|---|---|---|
| Daemon unavailable | May fall back in-process when policy permits; receipt says `runtime: "in-process-fallback"` and storage is memory/none. | Fail clearly. |
| Incompatible daemon protocol | Fail or fall back only if the operation is policy-equivalent. | Fail clearly. |
| Unwritable `GRAFT_HOME` | May use ephemeral reads with explicit receipt. | Fail unless an existing readable history binding is available without writes. |
| Corrupt metadata | Quarantine or refuse that workspace; do not guess. | Return corruption error for affected binding/store. |
| History unavailable | Current-state features continue where policy allows. | Return `HISTORY_UNAVAILABLE`. |
| Insufficient scope | Current-state features continue where policy allows. | Return `INSUFFICIENT_SCOPE`. |
| Converter failure | Return projection failure with bounded diagnostics. | Not applicable unless history needs projection facts. |
| Concurrent CLI/daemon writes | Use plan/commit journal, generation fencing, and atomic replacement. | Use plan/commit journal, generation fencing, and atomic replacement. |
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
3. bare `graft serve` flips only after compatibility evidence, generated
   config updates, notices, migration rules, and a rollback story.

Use "compatibility evidence" unless remote telemetry is explicitly documented,
opt-in, minimized, and covered by retention policy.

## Receipts

Receipts expose resource scope and only disclose fields authorized for the
current session.

Example redacted workspace-view read receipt:

```json
{
  "receiptId": "rct_unguessable",
  "resourceScope": {
    "kind": "workspace-view",
    "workspaceId": "ws_abc123",
    "workspaceViewId": "wv_docs"
  },
  "workspace": {
    "id": "ws_abc123",
    "root": null,
    "rootDisclosure": "redacted"
  },
  "workspaceView": {
    "id": "wv_docs",
    "root": "/authorized/docs"
  },
  "visibilityContext": {
    "grantId": "grant_opaque",
    "grantEpoch": 7,
    "scopeDigest": "sha256:...",
    "policyDigest": "sha256:..."
  },
  "incarnation": {
    "id": "wi_current",
    "status": "confirmed"
  },
  "runtime": "daemon",
  "factSource": "filesystem",
  "historyBinding": null,
  "storage": {
    "registry": "graft-managed",
    "cache": "graft-managed"
  },
  "sourceSnapshot": {
    "fileIdentity": "opaque-platform-id",
    "size": 1234,
    "mtimeNs": 123456789,
    "sha256": null,
    "stability": "stable"
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

Object-only receipt:

```json
{
  "receiptId": "rct_object",
  "resourceScope": {
    "kind": "file-object",
    "objectId": "object_opaque"
  },
  "workspace": null,
  "workspaceView": null,
  "incarnation": null,
  "storage": {
    "registry": "none",
    "cache": "memory"
  }
}
```

Fact sources:

| Source | Meaning |
|---|---|
| `filesystem` | Fresh current-state read from the authorized opened object. |
| `daemon-cache` | Cached derived fact whose input provenance is still policy-allowed. |
| `warp-history` | Durable structural history fact from an authorized history binding. |
| `document-projection` | Bounded document conversion/projection artifact. |

`graft_map` distinguishes current-snapshot output from historical map output in
either naming or receipt fields.

Global last-operation explanation is not a public operation. Use:

```text
graft workspace explain-operation <receipt-id>
```

or a strictly local-session-scoped "last" alias. Receipt IDs are unguessable or
authorization-protected, and explanation reapplies control-plane disclosure
rules.

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
  -> open through race-resistant path mechanism or authorized handle
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

Document conversion respects file bans, `.graftignore`, authorization, cache
clearing, process limits, memory limits, time limits, output-size limits, and
workspace-view visibility. OCR is out of scope for the first document slice.
Active content, external references, attachments, and network access are never
executed or fetched. Page markers preserve reliable page provenance where the
converter can provide it.

## Public Surfaces

Candidate CLI:

```text
graft daemon status
graft doctor
graft protocol-version
graft workspaces list
graft workspace status <path-or-resource-id>
graft workspace explain <path>
graft workspace explain-operation <receipt-id>
graft workspace plan-operation <operation> <path-or-resource-id>
graft workspace commit-operation <plan-id>
graft workspace track-plan <path-or-resource-id>
graft workspace track <plan-id>
graft workspace pause <history-binding-id>
graft workspace resume <history-binding-id>
graft workspace purge-history <plan-id>
graft workspace forget <plan-id>
graft workspace exclude <path-or-workspace-id>
graft workspace include <path-or-workspace-id>
graft workspace prune
graft workspace prune --apply <plan-id>
graft workspace relink <plan-id>
```

Candidate MCP tools:

```text
workspace_plan_operation
workspace_commit_operation
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
workspace_explain_operation
```

Specialized mutating MCP tools are aliases over `workspace_commit_operation`.
They require `planId` plus a host-issued approval token reference and use the
same digest, precondition, approval, idempotency, prepare/commit, and generation
fencing path.

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
- Control-plane operations cannot enumerate or mutate workspaces, views,
  bindings, stores, or receipts outside the session's scoped capabilities.
- A docs-only management capability cannot purge full-repository history.
- Relative paths resolve against request `cwd`, authorized root, workspace
  view, opened root, or handle. They never resolve against daemon `cwd`.
- The opened object, not merely an earlier pathname, is authorized.
- If the platform cannot enforce path containment, the operation uses a
  pre-opened handle, in-sandbox implementation, or refusal.
- Symlinks, magic links, mount crossings, reparse points, and changing
  intermediate path components cannot bypass policy.
- FIFOs, device nodes, sockets, and other special files are refused by default.
- Repository discovery never walks above the authorized root without a metadata
  discovery grant.
- A subdirectory grant produces a scoped workspace view or scoped-directory
  workspace rather than silently exposing the full repository.
- File-handle-only operations produce object-only receipts without fake
  workspaces.
- A host-declared workspace can bind a limited view to a known workspace without
  authorizing daemon parent discovery.
- A remote URL change does not change the workspace ID.
- Two same-basename repositories get different IDs.
- `workspaceViewId` is stable across grant epoch and policy changes.
- Transient grant/policy data appears in `visibilityContext`, not durable view
  identity.
- Possession or knowledge of a `workspaceViewId` without a valid grant does
  not permit reads, cache access, history queries, or control-plane disclosure.
- A daemon restart preserves the same IDs.
- Strong same-path replacement signals produce incarnation mismatch and
  quarantine; weak evidence produces `suspect` or `unknown` and blocks durable
  attachment.
- Every durable derived artifact is partitioned by `incarnationId`, and no
  artifact created for one incarnation can attach to another incarnation.
- Bare Git repositories are refused or explicitly out of scope.
- A safe read creates no target `.graft`, no provider history store, and no
  application-level target-tree modifications.
- An unwritable managed store still permits an ephemeral safe read when policy
  allows fallback.
- A workspace can use a Graft-managed registry/cache with repo-local history
  bindings.
- Repo-local history has a portable `historyStoreId` distinct from local
  `workspaceId`.
- Workspace metadata stores `historyBindingIds`, not singular `historyStoreId`,
  `history`, or `trackingAuthorization`.
- Workspace metadata does not store `recordState` or `exclusionPolicy`.
- One logical history binding maps to one physical history store in v1.
- Repo-local history requires a full-worktree tracking scope in v1.
- Tracking obstruction creates no history state.
- Tracking cannot be enabled without an approved immutable plan and valid read
  authorization.
- Activation returns `OPERATION_PLAN_STALE` when plan preconditions materially
  change.
- Durable maintenance pauses when tracking authorization expires or is revoked.
- Repo-local tracking requires stronger approval and target write
  authorization.
- `paused` history remains readable with stale/frozen watermark receipts.
- Unavailable active history returns `HISTORY_UNAVAILABLE`, not
  `WORKSPACE_TRACKING_REQUIRED`.
- Corrupt active history becomes paused/corrupt and is quarantined.
- History queries report `scopeCompleteness`.
- History queries report `temporalCompleteness` and return
  `INSUFFICIENT_HISTORY_COVERAGE` when coverage is too incomplete for the
  requested claim.
- Ambiguous non-equivalent history binding candidates return
  `HISTORY_BINDING_AMBIGUOUS` instead of silently choosing or unioning.
- Insufficiently scoped historical conclusions return `INSUFFICIENT_SCOPE`.
- Uncertain scope algebra results deny authorization and management, miss cache
  reuse, and refuse or truncate historical filtering.
- Historical rename lineage is truncated at scope boundaries without revealing
  hidden paths or hidden counts.
- `exclude` preserves managed state, pauses bindings, fences background
  maintenance, and records policy.
- `include` removes exclusion and does not automatically resume tracking.
- `forget` deletes selected Graft-managed state without changing exclusion
  policy unless explicitly planned.
- An excluded-and-forgotten location remains manageable through its exclusion
  entry.
- Default pruning is plan-only and never deletes active or paused history.
- A deleted or moved workspace with an existing managed record can be managed
  using its workspace ID.
- Cache hits reapply current authorization, ignore, content governance,
  workspace-view, visibility-context, and capability-epoch policy.
- A narrow workspace view cannot receive aggregate cache/history facts created
  by a broader view unless safely filtered by input provenance and truth
  semantics.
- Historical deleted paths are authorized by workspace-relative historical path
  under an authorized root, not by current filesystem canonicalization.
- Concurrent first observation produces one valid workspace record.
- Multi-object mutations use operation IDs, idempotency keys, prepare/commit
  journals, startup reconciliation, and generation fencing.
- No active binding exists without a valid consent receipt and initialized
  store.
- No active or paused binding exists without a retained
  `consentAuthorityRecord`.
- Specialized mutation commands consume approved plan IDs and use the same
  digest, precondition, approval, idempotency, journal, and generation-fence
  path as `workspace_commit_operation`.
- No background job runs after exclude, forget, purge, replacement quarantine,
  or grant revocation.
- Normal read receipts do not compute full source SHA-256 unless the full file
  was already authorized and consumed and size/type limits permit it.
- Parser/cache facts from unstable reads are not cached.
- Multi-file maps include directory-enumeration watermarks.
- Repo-local WARP loading ignores alternates, external config includes, hooks,
  fsmonitor, filters, textconv, external diffs, editors, pagers, credential
  helpers, remote helpers, and network fetches.
- Plain `pdftotext` output is reported as text, not Markdown.
- Document active content, external references, attachments, and network access
  are never executed or fetched.
- Schema and identity migration rules exist before the daemon becomes the
  default writer.
- Docs clearly distinguish host permissions, Graft authorization, Graft read
  policy, stable views, visibility contexts, history bindings, durable tracking
  consent, and durable tracking authorization.

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
- [ ] Is it clear that workspace views are stable visibility while grants and
      policy digests are transient visibility context?
- [ ] Do history bindings make it clear that tracking is scoped rather than
      singular on the workspace?
- [ ] Do lifecycle verbs make deletion, exclusion, pausing, repo-local mutation,
      and audit retention consequences explicit?
- [ ] Is it clear that exclude preserves state and forget deletes state?
- [ ] Does plan/commit make approval specific enough to prevent executing a
      materially different operation?

### Agent

- [ ] Does workspace identity remain stable and collision-resistant when two
      repos share the same basename?
- [ ] Does changing remote URLs leave the workspace ID unchanged?
- [ ] Does a same-path repository replacement produce confirmed, suspect,
      replaced, or unknown incarnation posture without attaching old history
      unsafely?
- [ ] Does a safe read in an untracked workspace create only authorized
      Graft-managed metadata/cache state and no target-tree mutation?
- [ ] Does a history-only tool ask for tracking with an approval-required plan
      and create no history state?
- [ ] Can a workspace be forgotten, included, excluded, pruned, purged, or
      relinked with unambiguous deletion semantics?
- [ ] Do cache hits reapply the current authorization, ignore, ban, content
      governance, workspace-view, visibility-context, and capability-epoch
      policy?
- [ ] Does an unwritable managed store fall back to explicit ephemeral posture
      rather than lying about persistence?
- [ ] Do paused history answers remain readable with stale/frozen watermarks?
- [ ] Do control-plane tools hide unrelated registry entries from narrow MCP
      sessions?
- [ ] Does race-safe opening authorize the object actually read rather than a
      stale path resolution?
- [ ] Does a scoped view query history only through contained/intersecting
      history bindings and report complete, partial, or insufficient scope?
- [ ] Do historical rename boundaries avoid revealing hidden former/new paths or
      hidden counts?
- [ ] Do object-only operations produce receipts without fake workspace IDs?
- [ ] Do destructive operations use plan digest, preconditions, idempotency, and
      startup reconciliation?
- [ ] Does repo-local WARP loading neutralize ambient Git config, hooks,
      alternates, helpers, and network behavior?

## Non-goals

- [ ] Do not make Graft a global filesystem permission system.
- [ ] Do not treat daemon OS readability as client authorization.
- [ ] Do not treat tracking consent as filesystem authorization.
- [ ] Do not initialize durable structural-history tracking merely because a
      file was read.
- [ ] Do not let an agent auto-follow a proposed action and call that user
      consent.
- [ ] Do not require target repos to contain `.graft` by default.
- [ ] Do not implement document projection before the document-projection
      slice.
- [ ] Do not flip bare `graft serve` behavior without compatibility evidence
      and staged migration.
- [ ] Do not solve cross-workspace semantic symbol references in this slice.
- [ ] Do not create durable workspace records for every random temporary file
      or directory.
- [ ] Do not label plain converter text as Markdown.
- [ ] Do not support bare Git repositories in Slice 1 without a separate
      identity contract.
- [ ] Do not use grant epochs, policy versions, grant IDs, or session IDs as
      durable workspace view identity.
- [ ] Do not store singular history lifecycle fields on the workspace.
- [ ] Do not make `exclude` delete state.
- [ ] Do not return filtered historical conclusions as globally complete.

## Execution Roadmap

The goalpost roadmap now lives in
[`SURFACE_graft-managed-workspace-store-roadmap.md`](./SURFACE_graft-managed-workspace-store-roadmap.md).

This packet remains the normative Slice 0 contract. The roadmap is the
implementation control surface for sequencing, PR-sized slices, release
checkpoints, and exit gates. If a sequencing question conflicts with the compact
legacy outline below, follow the roadmap.

## Legacy Slice Outline

### Slice 0 — Security and state contract

Freeze authorization, resource-scoped control-plane capabilities, resource
scopes, store topology, stable workspace views, visibility contexts, identity,
incarnation posture, history bindings, history lifecycle/availability,
tracking consent, plan/commit, tracking authorization, crash consistency,
lifecycle semantics, retention defaults, path opening, repository discovery,
cache/history visibility, daemon failure behavior, receipt structure, and
migration rules. This packet is the Slice 0 design artifact. No router work
starts until Slice 0 is approved.

### Slice 1 — Workspace registry

Add ID-only storage paths, workspace metadata schema, incarnation records,
stable workspace view records, history binding records, exclusion registry,
include/exclude status, status/list authorization, atomic writes, secure
directory creation, permissions, sanitized remote metadata, deterministic
workspace identity, stable view identity, resource-scope receipts, and
schema/identity migration scaffolding. Structural-history provider storage sits
behind `StructuralHistoryPort` adapters; Slice 1 registry code does not open
git-warp or assume provider-specific history layout. Safe reads still use
existing execution paths.

### Slice 2 — Daemon routing and lightweight reads

Blocked until Slice 0. Route authorized absolute or outside-current-workspace
paths through daemon resource/workspace/view resolution. Include session
capabilities, race-safe opening, mount/reparse policy, repository discovery
boundaries, deterministic observation promotion, aggregate cache scoping,
coherent source snapshots, receipts, and in-process ephemeral fallback.

### Slice 3A — Tracking approval, enable, pause, resume, obstruction

Ship plan/commit for tracking, approval-required obstructions, enable tracking,
pause, and resume. Create scoped history bindings, enforce tracking
authorization, record consent receipts, and keep paused history readable with a
frozen watermark.

### Slice 3B — Include, exclude, forget, prune

Ship include/exclude, forget, and plan-first prune semantics. Enforce
resource-scoped control-plane capabilities, preserve state on exclude, separate
policy from deletion, and distinguish Graft-managed deletion from repo-local
target mutation.

### Slice 3C — Purge-history, replacement handling, relink

Ship destructive history purge, same-path replacement posture/quarantine, and
explicit relink. Require plan/commit approval, incarnation validation, exact
binding/store authority, and clear manifest/mapping behavior.

### Slice 4 — Hook modes

Separate authorization/filesystem safety, configurable content governance, and
hook guidance. Add `advisory`, `balanced`, `strict`, and `hook-lockdown` modes,
define outage behavior, and rate-limit native-read reminders.

### Slice 5 — Document projection

Add sandboxed document conversion, accurate format provenance, page mapping,
cache limits, confidence/warning fields, active-content refusal, no-network
guarantees, and failure states.

### Slice 6 — Default-command transition

Move bare `graft serve` only after compatibility evidence, generated config
updates, notices, migration rules, and a rollback story.

## Slice 0 Freeze Errata

These errata are normative and freeze Slice 0 after the Take Four approval
review.

### View authority

`workspaceViewId` alone confers no authority. Possession or knowledge of a
workspace view ID without a valid grant does not permit reads, cache access,
history queries, or control-plane disclosure. A workspace view becomes usable
only through a current valid `visibilityContext` backed by a host-provided
grant.

### Incarnation-partitioned artifacts

Stable `workspaceViewId` survives same-path replacement, so every durable
derived artifact is partitioned by `incarnationId`.

Required:

- `incarnationId` appears in every durable artifact envelope.
- `incarnationId` is part of cache keys, aggregate-index provenance, document
  projections, map records, operation preconditions, and cache-directory
  ownership or partitioning.
- Cache layout either nests under `workspaces/<workspace-id>/incarnations/<incarnation-id>/cache/`
  or every cache read/write path requires exact `incarnationId` match.

Invariant:

```text
No durable derived fact created for one incarnation may be attached to another
incarnation, even when workspaceId, workspaceViewId, path, size, and timestamps
happen to match.
```

### Historical coverage and binding selection

`scopeCompleteness` answers only spatial coverage. Historical answers also
report temporal coverage.

Binding coverage:

```json
{
  "coverage": {
    "basis": "git-history | observed-events | hybrid",
    "from": {
      "commit": "optional",
      "observedAt": "optional"
    },
    "through": {
      "commit": "optional",
      "observedAt": "optional"
    },
    "continuity": "continuous | gapped | unknown"
  }
}
```

Historical answers report:

```text
scopeCompleteness:
  complete | partial | insufficient
temporalCompleteness:
  complete | partial | insufficient | unknown
```

Dead-symbol history, structural churn, "never referenced", and similar claims
require complete enough spatial scope and continuous temporal coverage. If the
claim cannot be made honestly, return `INSUFFICIENT_HISTORY_COVERAGE`.

History binding selection:

1. Use an explicitly requested `historyBindingId` when authorized.
2. Otherwise prefer an exact tracking-scope match.
3. Otherwise use a uniquely superior binding based on contained scope and
   usable coverage.
4. If multiple non-equivalent bindings remain, return
   `HISTORY_BINDING_AMBIGUOUS`.

Ambiguity responses may list redacted candidate bindings the session is
authorized to know about.

### Live bindings do not store `off`

No matching binding means effective tracking posture is off. Stored live
binding lifecycle is only:

```text
active | paused
```

Revised binding transitions:

```text
absent binding
  -- approved track -->
active binding

active
  -- pause -->
paused

paused
  -- resume -->
active

active | paused
  -- approved purge -->
absent binding
```

If an operation intentionally retains a post-purge descriptor, call it a
retired binding record or audit record. Do not call it an ordinary `off`
history binding.

### Consent authority versus audit receipts

Bindings distinguish authoritative consent from optional audit material.

```json
{
  "consentAuthorityRecordId": "ca_123",
  "consentAuditReceiptId": "cr_789"
}
```

Rules:

- The authoritative record cannot be pruned while the binding exists.
- Deleting or revoking the authoritative record fences maintenance and pauses
  the binding.
- Purge removes the binding and authoritative consent record transactionally.
- Residual audit receipts are separate and disclosed in the plan.
- Full forget deletes or explicitly discloses every workspace-linked residual
  record.

### Canonical identity and plan encoding

Slice 0 freezes the v1 encoding.

```text
installationId:
  random 128-bit value generated when GRAFT_HOME is initialized
canonical encoding:
  deterministic CBOR
digest:
  SHA-256
public ID:
  typed prefix + lowercase base32 of at least 128 digest bits
```

Example:

```text
workspaceId = encode(
  "ws_",
  SHA-256(
    deterministic-CBOR([
      "graft-workspace",
      1,
      installationId,
      platformNamespace,
      volumeNamespace,
      workspaceKind,
      canonicalIdentityComponents
    ])
  )
)
```

Use the same canonical-byte contract for `workspaceViewId`,
`trackingScopeId`, plan digests, operation precondition digests, and
visibility-context digests.

Plan digest:

```text
planDigest = SHA-256(
  deterministic-CBOR(plan excluding planDigest and approval/signature fields)
)
```

The stale-plan obstruction is `OPERATION_PLAN_STALE`, because the generic
protocol covers tracking, purge, prune, relink, forget, and target mutation.

### Exclusion precedence

`exclusionStatus: excluded` overrides binding lifecycle for content-serving
operations.

| Operation | Result while excluded |
|---|---|
| Authorized ephemeral current-state read | Allowed. |
| Cache-derived content response | Blocked. |
| Historical content query | `WORKSPACE_EXCLUDED`. |
| Status/inspection | Allowed with control-plane authority. |
| Include/forget/purge planning | Allowed with exact authority. |
| Background maintenance | Fenced. |
| Automatic cache pruning | Prohibited while preserve semantics apply. |
| Explicit approved deletion | Allowed. |

For v1, a location exclusion matches the canonical location and authorized
descendant resource scopes without disclosing the hidden parent workspace to the
requesting session. Object-only operations remain ephemeral and cannot create a
durable bypass.

### Mutating commands consume plans

Specialized mutation commands are aliases over the same commit path, never
alternate mutation implementations.

```text
graft workspace track <plan-id>
graft workspace purge-history <plan-id>
graft workspace forget <plan-id>
graft workspace relink <plan-id>
graft workspace prune --apply <plan-id>
```

Specialized MCP calls require:

```json
{
  "planId": "op_123",
  "approvalToken": "host-issued-reference"
}
```

They invoke the same digest validation, precondition validation, approval
validation, idempotency handling, prepare/commit journal, and generation fence.

### Repo-local Git hardening additions

Repo-local WARP access additionally prohibits:

- replacement refs;
- lazy object fetching;
- ambient system/global Git configuration;
- non-literal pathspec interpretation.

Hardened invocation conceptually enforces:

```text
GIT_NO_REPLACE_OBJECTS=1
GIT_NO_LAZY_FETCH=1
GIT_CONFIG_NOSYSTEM=1
explicit isolated HOME/config
literal pathspecs
no pager/editor/prompts
no network
```

### Migration invariants

Minimum migration contract:

- Unknown major schema is refused or quarantined.
- Managed-store migration is journaled and idempotent.
- Old state remains recoverable until commit.
- Interrupted migration reconciles at startup.
- Repo-local migration requires target write authority and an approved plan.
- Identity-version migration never silently merges workspaces, views, bindings,
  or history stores.

### Receipt retention

`explain-operation <receipt-id>` implies a receipt retention contract.

V1 must specify:

- default TTL;
- whether receipt bodies are durable or session-only;
- which path fields are redacted at rest;
- whether receipt IDs remain valid after forget;
- whether operation explanation reads the original receipt or reconstructs it
  from audit data.

## Folded Enhancement Requirements

The following previously suggested SHOULD, COULD, and COOL IDEA items are now
normative requirements in this packet:

- Remove `repositoryFamilyHint` from v1 unless a shipped feature uses it.
- Treat repo-local `.graft` and WARP state as untrusted repository input.
- Split hard policy into authorization/filesystem safety, configurable content
  governance, and hook guidance.
- Default the activity ledger to operation class, workspace/view IDs,
  timestamps, and aggregate sizes; make absolute paths optional.
- Require secure creation, ownership verification, restrictive permissions, and
  symlink refusal for Graft-home storage.
- State that document active content, external references, attachments, and
  network access are never executed or fetched.
- Add schema and identity migration rules before daemon default writing.
- Split destructive tracking/lifecycle work into Slices 3A, 3B, and 3C.
- Introduce stable `workspaceViewId` for workspace views.
- Keep transient grants, grant epochs, and policy digests in
  `visibilityContext`.
- Include capability epochs for cache invalidation when grants change.
- Strengthen `track-plan` into an immutable plan/commit consent surface.
- Add the normative state-transition table.
- Keep explicit `workspace relink` and require validation/approval.
- Keep document projection confidence and page provenance.
- Add generic `workspace_plan_operation` and `workspace_commit_operation`.
- Add conservative scope algebra with `relation`, `subtract`, and `unknown`.
- Add coherent source snapshot rules.
- Freeze identity encoding, including local `workspaceId` and portable
  `historyStoreId`.
- Tighten valid history lifecycle/availability combinations.
- Clarify consent receipt retention and residual records.
- Use "compatibility evidence" unless remote measurement is explicitly
  documented, opt-in, minimized, and covered by retention policy.

No SHOULD, COULD, or COOL IDEA item from the latest verdict is intentionally
deferred.
