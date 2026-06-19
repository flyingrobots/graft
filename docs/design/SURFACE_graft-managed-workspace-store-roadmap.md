---
title: "Daemon-first Graft-managed workspace store roadmap"
legend: "SURFACE"
cycle: "SURFACE_graft-managed-workspace-store"
parent_design: "docs/design/SURFACE_graft-managed-workspace-store.md"
---

# Daemon-first Graft-managed Workspace Store Roadmap

This roadmap is the execution control surface for
`SURFACE_graft-managed-workspace-store`. The parent design packet remains the
normative contract for authorization, identity, state topology, storage,
receipts, lifecycle, and failure behavior.

The first visible product proof is intentionally narrow:

```text
One daemon session can safely read two sibling repositories without mutating
either repository.
```

Do not start with durable history, hooks, repo-local portability, or document
projection. Those depend on the daemon proving safe multi-workspace current
state reads first.

## Critical Path

```text
G0 Contract Freeze
  -> G1 Secure State and Identity
  -> G2 Authorized Resource Router
  -> G3 Multi-workspace Safe Reads
  -> G4 Scoped Derived Cache
  -> G5 Plan/Commit Operation Kernel
  -> G6 Managed Structural-history Bindings
  -> G7 Truthful Historical Queries
  -> G8 Lifecycle and Replacement
  -> G12 Daemon-first Rollout
```

Parallel branches:

```text
G3       -> G10 Hook Governance
G4       -> G11 Document Projection
G5 + G6  -> G9 Repo-local Portable History Compatibility
```

Repo-local portable history and document projection must not block the
daemon-first core unless they become explicit launch promises.

## Current Status

As of `ba64ca25 feat: observe daemon workspaces in managed registry`:

| Goalpost | Status | Notes |
|---|---|---|
| G0 Contract Freeze | Mostly complete | Errata are folded; playback drift is covered. Canonical fixture vectors and threat/conformance matrix still need explicit artifacts. |
| G1 Secure State and Identity | In progress | First registry increment landed: installation-local workspace IDs, ID-only metadata paths, incarnation cache partitioning, sanitized remotes, and daemon authorization observation. |
| G2 Authorized Resource Router | Not started | Existing daemon binding remains the old authorization path; the new router security floor is not implemented. |
| G3 Multi-workspace Safe Reads | Not started | This is the first product demo target. |
| G4 Scoped Derived Cache | Not started | No durable derived cache should ship before G3. |
| G5 Plan/Commit Operation Kernel | Not started | Required before any public mutation surface. |
| G6 Managed Structural-history Bindings | Not started | Must use `StructuralHistoryPort`; Echo is the primary target after its integration gate. |
| G7 Truthful Historical Queries | Not started | Depends on G6 binding model and coverage semantics. |
| G8 Lifecycle and Replacement | Not started | Depends on G5 mutation kernel. |
| G9 Repo-local Portable History Compatibility | Not started | Parallel branch after G5+G6; not daemon-first critical path. |
| G10 Hook Governance | Not started | Parallel branch after G3. |
| G11 Document Projection | Not started | Parallel branch after G4. |
| G12 Daemon-first Rollout | Not started | Final rollout after core safety and migration posture. |

## Slice Discipline

Every slice must:

- deliver one primary behavior;
- introduce at most one state/schema migration;
- include positive, denial, restart, and concurrency tests where relevant;
- update receipts, diagnostics, and documentation in the same PR;
- be internal-only, off by default, or guarded by an explicit rollout flag;
- avoid mixing refactoring, migration, and new public behavior in one PR.

A twelve-headed daemon architecture PR is not acceptable. Each slice should be
small enough to review as behavior, not archaeology.

## G0 - Contract Freeze

### Goalpost

Take Four plus the required errata becomes the normative Slice 0 specification.
No unresolved "recommended", "could", or "implementation decides" language
remains on security-critical behavior.

| Slice | PR-sized result |
|---|---|
| G0.1 - Errata integration | Patch stable-view authorization, conservative scope algebra, incarnation-partitioned artifacts, temporal history coverage, binding selection, stored binding lifecycle, consent authority, exclusion precedence, and plan-only mutation surfaces. |
| G0.2 - Canonical contract schemas | Freeze contract schemas for workspace, incarnation, view, visibility context, history binding, consent authority, audit receipt, operation plan, receipt, exclusion, and artifact envelopes. This does not require full production storage implementation. |
| G0.3 - Identity encoding | Freeze installation ID, deterministic encoding, hashing, typed prefixes, case/Unicode rules, platform namespace, and ID migration behavior. |
| G0.4 - Error taxonomy | Freeze errors including `WORKSPACE_TRACKING_REQUIRED`, `HISTORY_UNAVAILABLE`, `HISTORY_BINDING_AMBIGUOUS`, `INSUFFICIENT_SCOPE`, `INSUFFICIENT_HISTORY_COVERAGE`, `WORKSPACE_EXCLUDED`, `WORKSPACE_REPLACED`, and `OPERATION_PLAN_STALE`. |
| G0.5 - Contract test vectors | Check in canonical ID, plan-digest, scope-relation, state-transition, receipt-redaction, and visibility fixtures usable by every implementation. |
| G0.6 - Threat and conformance matrix | Map each security claim to enforcement point, test suite, supported platform posture, and failure behavior. |

### Exit Gate

- Every persisted object has a versioned schema.
- Every mutating operation is classified as plan/commit or internal
  maintenance.
- Scope comparison can return `unknown`.
- `workspaceViewId` alone grants nothing.
- No security-relevant normative decision remains deferred.

## G1 - Secure State and Identity Foundation

### Goalpost

Graft can safely initialize and maintain its own home, create deterministic
local identities, and persist workspace records without reading repository
contents through the new router yet.

| Slice | PR-sized result |
|---|---|
| G1.1 - Secure Graft-home bootstrap | Create and verify `GRAFT_HOME`, installation ID, ownership, restrictive permissions, safe directory traversal, and symlink refusal. |
| G1.2 - Canonical ID codec | Implement deterministic encoding, SHA-256 derivation, typed base32 IDs, and checked decoding for every identity type. |
| G1.3 - Atomic record store | Add locking, generation checks, atomic replacement, fsync policy, malformed-record quarantine, and crash tests for single-record writes. |
| G1.4 - Workspace registry | Persist ID-only workspace directories and versioned metadata without history lifecycle fields. |
| G1.5 - Incarnation records | Add confirmed, suspect, replaced, and unknown posture plus quarantine mechanics. |
| G1.6 - Record repositories | Add storage APIs for views, history-binding references, exclusions, receipts, operations, and observations without exposing all public mutations yet. |
| G1.7 - Migration scaffold | Implement version detection, journaled migration shell, interrupted-migration recovery, and unknown-major refusal. |
| G1.8 - Diagnostics | Ship `graft daemon status`, `graft protocol-version`, and initial `graft doctor` checks for storage integrity. |

### Exit Gate

A trusted local CLI can create, reopen, inspect, and quarantine registry records
across daemon restarts. No target repository is modified.

## G2 - Authorized Resource Router

### Goalpost

The daemon can authenticate a client, evaluate grants, securely open an object,
and classify the operation as workspace-view, opened-root, scoped-directory, or
object-only.

| Slice | PR-sized result |
|---|---|
| G2.1 - Session authentication | Add authenticated daemon sessions, opaque grant IDs, expiry/revocation handling, and socket restrictions. |
| G2.2 - Resource-scoped capabilities | Implement read, cache-management, history-management, target-mutation, registry-list, and registry-admin capabilities with exact resource selectors. |
| G2.3 - Scope normalization | Implement canonical workspace-relative scope encoding, path validation, deterministic rule ordering, and case/Unicode posture. |
| G2.4 - Conservative scope algebra | Implement `equivalent`, `contains`, `contained-by`, `overlaps`, `disjoint`, and `unknown`; `unknown` always fails closed for authority. |
| G2.5 - Opened-root and file-object abstraction | Introduce handle-backed resource access that does not require path rediscovery or a fake workspace. |
| G2.6 - Race-safe traversal per supported platform | One PR per supported platform for beneath-root traversal, symlink/magic-link rules, mount policy, special-file refusal, and final-object validation. Unsupported guarantees fail closed. |
| G2.7 - Repository discovery boundaries | Implement authorized Git discovery, scoped-directory fallback, host-declared workspaces, linked-worktree restrictions, and object-only outcomes. |
| G2.8 - Stable workspace views | Derive views from stable scope descriptors while placing grant epoch and policy digest in `visibilityContext`. |
| G2.9 - Scoped control-plane disclosure | Add redacted status/list behavior so narrow sessions cannot enumerate parent roots or unrelated resources. |
| G2.10 - Base receipt envelope | Emit resource scope, visibility context, runtime, grant ID, redaction posture, and object/workspace resolution result. |

### Exit Gate

- Knowing a workspace or view ID grants no access.
- A docs-only grant cannot discover or disclose the parent repository.
- An object handle produces an object-only receipt.
- Path traversal either meets the security floor or is refused.

## G3 - Multi-workspace Safe Reads

### Goalpost

First product milestone: one daemon session can safely read across multiple
authorized repositories without creating `.graft` state in any target.

| Slice | PR-sized result |
|---|---|
| G3.1 - Object-only `safe_read` | Bounded reads from an authorized file object with special-file refusal and no workspace registration. |
| G3.2 - Opened-root `safe_read` | Secure relative traversal beneath an authorized root with coherent source snapshots. |
| G3.3 - Workspace-routed `safe_read` | Resolve workspace/view/incarnation, perform the read, and emit a full scoped receipt. |
| G3.4 - Deterministic observation promotion | Register authorized Git/opened-root workspaces after the first successful operation; keep ad hoc files ephemeral. |
| G3.5 - `read_range` | Add bounded range reads using the same opener, policy, snapshot, and receipt path. |
| G3.6 - `file_outline` | Add parser-backed outlines with unstable-read detection and no durable cache yet. |
| G3.7 - Current-snapshot `graft_map` | Add scoped multi-file mapping with directory-enumeration watermarks. Durable caching remains out of scope until G4. |
| G3.8 - Ephemeral fallback | Permit policy-equivalent in-process fallback when daemon storage is unavailable; clearly report memory/none storage. |
| G3.9 - Operation explanation | Ship receipt-scoped `explain-operation`, authorization-protected and disclosure-redacted. |

### Exit Gate

Demo:

```text
session grant:
  /work/server
  /work/sdk

safe_read server/src/a.ts
safe_read sdk/src/b.ts
```

Both reads succeed through one daemon session, neither repository receives
`.graft`, an unauthorized sibling is refused, and every receipt identifies
exactly what authorized the result.

### Release Checkpoint

Current-state Alpha.

## G4 - Scoped Derived Cache

### Goalpost

Current-state reads become fast without creating cross-view, cross-policy, or
cross-incarnation leaks.

| Slice | PR-sized result |
|---|---|
| G4.1 - Artifact envelope | Add input provenance, transformation version, stable view, visibility context, policy digest, snapshot, and `incarnationId` to every artifact. |
| G4.2 - Incarnation-partitioned layout | Physically partition durable cache by incarnation or enforce an exact incarnation match at every access boundary. |
| G4.3 - Cache policy backend | Implement metadata-only, derived-content, and no-store; never cache raw reads by default. |
| G4.4 - Outline/projection cache path | Cache simple single-file derived facts with current-policy revalidation. |
| G4.5 - Capability-epoch invalidation | Treat stale or narrowed visibility context as a miss unless safe filtering is proven. |
| G4.6 - Aggregate provenance | Record path-level inputs for maps and indexes; regenerate when safe filtering cannot be demonstrated. |
| G4.7 - Truth-aware filtering | Return partial/insufficient rather than presenting a filtered aggregate as globally complete. |
| G4.8 - Retention and budgets | Add per-view, per-workspace, and global budgets, TTL handling, sensitive-file no-store, and exclusion-aware automatic maintenance. |
| G4.9 - Cache inspection | Add authorized, redacted inspection without yet introducing ad hoc destructive deletion paths. |

### Exit Gate

A docs-only view cannot receive source-wide cache facts even when those facts
already exist. A same-path replacement cannot reuse old derived artifacts.

### Release Checkpoint

Current-state Beta.

## G5 - Generic Plan/Commit Operation Kernel

### Goalpost

Every user-visible mutation is planned, approved, revalidated, journaled, and
committed through one execution path.

| Slice | PR-sized result |
|---|---|
| G5.1 - Canonical operation plan | Implement deterministic plan serialization, digesting, expiry, effects, preconditions, exact resource targets, and residual-record disclosure. |
| G5.2 - Approval adapter | Validate host-confirmed approval or host-issued tokens, audience, expiry, operation scope, and replay protection. |
| G5.3 - Precondition engine | Recheck incarnation, scope, visibility epoch, target paths, storage mode, and generations; return `OPERATION_PLAN_STALE` on material change. |
| G5.4 - Mutation journal | Add operation IDs, idempotency keys, prepare/commit records, generation fencing, and startup reconciliation. |
| G5.5 - Consent authority records | Separate binding-authoritative consent from optional audit receipts and enforce lifecycle retention rules. |
| G5.6 - Exact cache-prune consumer | Prove the kernel with plan-only cache pruning where commit deletes precisely the reviewed artifact set. |
| G5.7 - Specialized-command enforcement | Make all convenience commands thin aliases over the same commit engine; reject planless mutation calls. |

### Exit Gate

A reviewed plan cannot mutate a different resource set. Retrying a commit cannot
duplicate state. Restarting during commit produces either a reconciled result or
quarantine, never partial active state.

## G6 - Graft-managed Structural-history Bindings

### Goalpost

A user can create, maintain, pause, and resume a scoped Graft-managed
structural-history binding without mutating the target repository.

All durable structural history is accessed through `StructuralHistoryPort`.
Echo is the primary future provider after the Echo integration gate. git-warp
remains import/fallback compatibility and must not shape the registry.

| Slice | PR-sized result |
|---|---|
| G6.1 - History-binding model | Persist binding, tracking scope, physical store identity, lifecycle, availability, watermark, coverage, authorization reference, and consent authority reference. |
| G6.2 - Per-binding store abstraction | Enforce one logical binding per physical provider store in v1. |
| G6.3 - Track-plan builder | Estimate files/bytes, show scope, maintenance mode, ignored categories, write targets, retention, and target-mutation posture. |
| G6.4 - Managed provider-store initialization | Create and validate a Graft-managed provider store without activating the binding. |
| G6.5 - Transactional activation | Atomically initialize store, create consent authority, create binding, and register maintenance. |
| G6.6 - Session-bound maintenance | Update history only while an authorized session exists. |
| G6.7 - Durable-grant maintenance | Support host-issued durable authority, expiration, revocation epoch, and automatic pause. |
| G6.8 - Pause/resume | Preserve readable history while paused; resume only with valid authorization and a current plan where required. |
| G6.9 - Availability and corruption posture | Distinguish readable, unavailable, and paused/corrupt states with quarantine behavior. |

### Exit Gate

A docs-only managed binding can be activated, updated, paused, queried while
frozen, and automatically paused when authority expires.

### Release Checkpoint

Managed History Alpha.

## G7 - Truthful Historical Queries

### Goalpost

History answers are correctly selected, spatially scoped, temporally qualified,
and honest about insufficiency.

| Slice | PR-sized result |
|---|---|
| G7.1 - Binding selection | Explicit binding wins; otherwise exact scope wins; otherwise unique superior binding; ambiguity returns `HISTORY_BINDING_AMBIGUOUS`. |
| G7.2 - Spatial completeness | Report complete, partial, or insufficient based on conservative scope relations. |
| G7.3 - Temporal coverage | Add basis, start, through, and continuity; report temporal completeness independently from path scope. |
| G7.4 - Feature coverage requirements | Classify history features by required spatial and temporal coverage. |
| G7.5 - Insufficient-history handling | Return `INSUFFICIENT_HISTORY_COVERAGE` for claims that cannot be supported by available continuity. |
| G7.6 - Historical rename boundaries | Truncate lineage when it crosses visibility scope without revealing hidden paths or counts. |
| G7.7 - Paused/unavailable receipts | Report frozen watermark, gaps, binding ID, and coverage without implying freshness. |
| G7.8 - Historical feature adapters | Migrate existing timelines, churn, blame, dead-symbol, and other history-backed tools onto binding selection and completeness rules. |

### Exit Gate

A docs-only query cannot produce a repository-wide dead-symbol claim. A paused
binding remains readable but visibly stale. Ambiguous overlapping bindings are
never silently merged.

### Release Checkpoint

Managed History Beta.

## G8 - Lifecycle, Exclusion, and Replacement

### Goalpost

Users can preserve, delete, quarantine, and reconnect state with exact semantics
and no mutation bypasses.

| Slice | PR-sized result |
|---|---|
| G8.1 - Exclusion matching and precedence | Apply location-level exclusion to descendant scopes, block durable serving, preserve state, and fence maintenance. |
| G8.2 - Include/exclude plans | Add approved include/exclude commits; include never auto-resumes tracking. |
| G8.3 - Forget plans | Delete selected Graft-managed registry/cache/history state while separately disclosing audit residue and exclusion posture. |
| G8.4 - History purge plans | Fence maintenance, delete an exact binding/store transactionally, and remove authoritative consent with it. |
| G8.5 - Registry prune plans | Plan stale-record cleanup; require `registry-admin` for unscoped registry-wide operations. |
| G8.6 - Replacement detection | Produce confirmed/suspect/replaced/unknown posture and block durable attachment on uncertainty. |
| G8.7 - Replacement quarantine | Quarantine old caches and bindings without silently deleting them. |
| G8.8 - Relink plans | Validate old history against the new incarnation and disclose mapping/store effects before approval. |
| G8.9 - Migration completion | Add real version migrations, identity-version handling, rollback/recovery, and no-silent-merge invariants. |

### Exit Gate

- Exclude preserves.
- Forget deletes.
- Purge removes one exact history binding.
- Replacement never inherits old history by accident.
- Every mutation consumes a reviewed plan.

### Release Checkpoint

Daemon-managed Core GA Candidate.

## G9 - Repo-local Portable History Compatibility

### Goalpost

Users can explicitly opt into portable/team history state without granting
ambient Git behavior or weakening target-mutation controls.

git-warp is the first compatibility adapter for repo-local portable history.
It is not the default durable-history architecture.

| Slice | PR-sized result |
|---|---|
| G9.1 - Hardened repo-local reader | Validate manifests, object bounds, paths, refs, configuration, and store structure as hostile input. |
| G9.2 - Ambient Git neutralization | Disable hooks, alternates, replacement refs, lazy fetch, external config, filters, helpers, prompts, pagers, editors, remote helpers, and network access. |
| G9.3 - Full-worktree scope enforcement | Reject partial repo-local history bindings in v1. |
| G9.4 - Repo-local track plan | Require stronger consent, exact target writes, full-worktree authority, and `workspace-mutate-target`. |
| G9.5 - Initialize and bind | Create portable `historyStoreId`, repo-local manifest, and local workspace binding transactionally. |
| G9.6 - Portable attachment validation | Treat manifest IDs as claims; validate incarnation and store content before mapping. |
| G9.7 - Repo-local deletion plan | Provide a separate explicit destructive operation for target `.graft` removal. |
| G9.8 - Portable migration | Require target-write authority and plan/commit for repo-local schema migration. |

### Exit Gate

Repo-local history works across two local clones without using either clone's
path-derived workspace ID as portable authority.

## G10 - Hook Governance

### Goalpost

Instrumented clients are guided or constrained consistently without pretending
Graft is an operating-system sandbox.

| Slice | PR-sized result |
|---|---|
| G10.1 - Shared policy-decision API | Expose authorization safety, content governance, and hook guidance as separate decision layers. |
| G10.2 - Advisory mode | Add rate-limited contextual guidance with no guidance-level blocking. |
| G10.3 - Balanced mode | Block expensive native reads when a safe Graft alternative exists. |
| G10.4 - Strict mode | Route most source reads through Graft with explicit small-file and allowlist rules. |
| G10.5 - Hook-lockdown mode | Block non-allowlisted native reads only within instrumented clients. |
| G10.6 - Cross-workspace classification | Let hooks classify authorized paths outside client cwd through the daemon. |
| G10.7 - Outage behavior | Implement configured fail-open/fail-closed behavior and prevent reminder spam. |

### Exit Gate

Allowed native reads receive useful, throttled guidance; outside-cwd paths no
longer bypass classification; hook-lockdown never claims OS-level enforcement.

## G11 - Document Projection

### Goalpost

Text-bearing documents become bounded, scoped projections with honest
provenance rather than generic binary refusals.

| Slice | PR-sized result |
|---|---|
| G11.1 - Converter sandbox interface | Add no-network execution, process/memory/time/output limits, sanitized environment, and active-content refusal. |
| G11.2 - PDF-to-text converter | Produce bounded text and report converter identity without calling it Markdown. |
| G11.3 - Page provenance | Add page markers, coverage, layout confidence, and warnings. |
| G11.4 - Projection artifact envelope | Partition by incarnation/view and record source snapshot, converter version, options, and policy context. |
| G11.5 - Projection cache | Reuse only when current authorization and every input remain valid. |
| G11.6 - Document outline and range tools | Expose bounded outline, page, and text-range surfaces through ordinary receipts. |
| G11.7 - Clearing and retention | Integrate projections with budgets, cache inspection, and plan-based deletion. |

### Exit Gate

A PDF can be outlined through a docs-only view without fetching links,
extracting attachments, running active content, or leaking broader workspace
facts.

## G12 - Daemon-first Rollout

### Goalpost

Daemon-backed operation becomes the normal setup without surprising existing
users or creating an unrecoverable migration.

| Slice | PR-sized result |
|---|---|
| G12.1 - Protocol negotiation | Require client/daemon compatibility checks and defined fallback behavior. |
| G12.2 - Setup generation | Make generated configuration choose daemon runtime while preserving explicit repo-local mode. |
| G12.3 - Migration command | Add dry-run migration planning, compatibility checks, and rollback instructions. |
| G12.4 - Compatibility evidence | Collect local diagnostics or explicitly opt-in minimized measurement; no stealth telemetry. |
| G12.5 - Documentation transition | Call daemon runtime normal, document grants, views, storage, tracking, failure modes, and recovery. |
| G12.6 - Compatibility notices | Warn users of the upcoming bare-command behavior change across at least one staged release. |
| G12.7 - Bare-command flip | Change `graft serve` only after rollout gates pass. |
| G12.8 - Rollback path | Preserve an explicit command/config switch back to the prior runtime. |

### Exit Gate

A fresh install uses the daemon path, an upgraded install receives a clear
migration, and users can roll back without losing managed history.

### Release Checkpoint

Daemon-first GA.

## Release Ladder

| Checkpoint | Goalposts required | Product promise |
|---|---|---|
| Current-state Alpha | G0-G3 | Safe authorized reads across multiple workspaces, no target mutation. |
| Current-state Beta | G0-G4 | Cached outlines/maps with scoped provenance and no cross-view leakage. |
| Managed History Alpha | G0-G6 | Scoped managed tracking, activation, pause, resume, and authorization expiry. |
| Managed History Beta | G0-G7 | Truthful spatial and temporal history answers. |
| Core GA Candidate | G0-G8 | Complete managed lifecycle, exclusion, deletion, replacement, and relinking. |
| Portable History | G9 | Explicit hardened repo-local team mode. |
| Governed Integrations | G10 | Full hook guidance and enforcement modes. |
| Document-aware | G11 | Safe bounded PDF/document projections. |
| Daemon-first GA | G0-G8, G10, G12 | Daemon becomes the normal supported runtime. |

## Hard Sequencing Rules

1. No router before G0.
2. No path-based read before G2 proves containment.
3. No durable cache before incarnation partitioning and artifact provenance are
   implemented.
4. No public mutation before G5.
5. No history query before binding selection and completeness semantics.
6. No repo-local WARP through ambient Git execution.
7. No bare `graft serve` flip before migration and rollback exist.

The shortest sane route to visible value is:

```text
G0 -> G1 -> G2 -> G3
```

Get that demo working before touching durable history.
