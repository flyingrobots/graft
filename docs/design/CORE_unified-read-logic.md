---
title: "Unified governed read logic"
legend: "CORE"
cycle: "CORE_unified-read-logic"
source_audits:
  - "docs/audit/2026-05-04_code-quality.md"
  - "docs/audit/2026-05-04_ship-readiness.md"
---

# Unified governed read logic

Source audits:
`docs/audit/2026-05-04_code-quality.md`,
`docs/audit/2026-05-04_ship-readiness.md`

Legend: CORE

## Hill

Make governed read cache and diff behavior a single application service
used by both the repo-local library surface and the MCP `safe_read`
handler.

Today, the system already has a reusable lower-level `safeRead`
operation, but the cache-hit, stale-diff, policy-recheck, outline
recording, and snapshot choreography live in more than one place. This
design defines a single source of truth for governed reads while keeping
public API and MCP contracts stable.

## Playback Questions

### Human

- [x] Can a human identify the one service that will own cache-hit and
      stale-diff read behavior?
- [x] Can a human see how `RepoWorkspace.safeRead` and MCP `safe_read`
      become adapters over the same service?
- [x] Can a human verify that existing public read result shapes do not
      change?

### Agent

- [x] Does the design cite the duplicated logic in
      `src/mcp/tools/safe-read.ts` and `src/operations/repo-workspace.ts`?
- [x] Does the design keep policy evaluation and cache updates in one
      governed-read path?
- [x] Does the design respect anti-sludge rules by using exact result
      variants rather than loose objects?

## Implementation Gravity

The duplicated behavior is visible in these spans:

- `src/mcp/tools/safe-read.ts:29`: the MCP handler resolves the path,
  records footprint, reads the file, constructs `CachedFile`, checks the
  cache, rechecks policy, returns `cache_hit`, returns `diff`, falls
  through to `safeRead`, records metrics, and updates cache.
- `src/operations/repo-workspace.ts:153`: `RepoWorkspace.safeRead`
  repeats file snapshot, cache-hit, stale-diff, policy refusal, lower
  `safeRead`, and cache-update logic for the library surface.
- `src/operations/cached-file.ts:24`: `CachedFile` computes hash,
  actual size, detected language, outline, and jump table eagerly in the
  constructor.

The two read surfaces must stay behaviorally aligned. Duplicated logic
makes that harder every time policy, cache, or outline behavior changes.

## Target Shape

Introduce one governed-read service in the operations/application layer.
Both surfaces become translators:

- `RepoWorkspace.safeRead` resolves a workspace path, calls the service,
  and returns the existing `RepoWorkspaceSafeReadResult` union.
- MCP `safe_read` resolves the MCP path, records MCP footprint/metrics,
  calls the service, and wraps the existing MCP result via
  `ctx.respond("safe_read", ...)`.

The service owns:

- one file snapshot read
- actual line and byte counts
- policy evaluation before returning governed data
- cache-hit decision
- stale-diff decision
- first-read projection through the lower `safeRead` operation
- cache recording for cacheable projections
- outline and jump-table reuse from the same snapshot

The adapters own:

- path resolution for their surface
- metrics recording
- footprint recording
- conversion to existing public result shape
- receipt wrapping

## Proposed Service

Name the service around the domain behavior, not the surface:

```ts
interface GovernedReadRequest {
  readonly path: string;
  readonly intent: string | undefined;
}

type GovernedReadResult =
  | GovernedReadContent
  | GovernedReadOutline
  | GovernedReadRefused
  | GovernedReadError
  | GovernedReadCacheHit
  | GovernedReadDiff;
```

The actual names may differ, but the shape must be a discriminated
union. It must not be a loose object whose fields are guessed by
callers.

Suggested dependencies:

```ts
interface GovernedReadDeps {
  readonly fs: FileSystem;
  readonly codec: JsonCodec;
  readonly cache: ObservationCache;
  readonly policy: GovernedReadPolicyPort;
  readonly governor: GovernedReadGovernorPort;
  readonly snapshot: FileSnapshotPort;
}
```

The policy and governor ports should be minimal. They should expose the
exact facts governed reads need, not a broad workspace object.

## Snapshot and Outline Policy

`CachedFile` currently solves a real race by building one immutable
snapshot from one raw read. Keep that invariant.

The next shape should split snapshot metadata from outline extraction:

- `FileSnapshot`: path, raw content, hash, actual size, detected format
- `OutlineSnapshot`: outline and jump table for supported formats

Rules:

- read file content once per governed read
- compute `actual` and hash from that one content value
- do not extract an outline before policy says governed structural data
  may be returned, unless the cache path needs it
- cache updates always use outline data derived from the same snapshot
- unsupported language behavior stays unchanged

This reduces eager work without reintroducing time-of-check/time-of-use
races.

## Cache and Diff Ownership

The governed-read service owns these branches:

### Cache Hit

If the cache has an unchanged observation:

1. Re-evaluate policy against current actual size.
2. If refused, return a refusal.
3. Touch the observation timestamp.
4. Return the existing `cache_hit` projection with outline, jump table,
   read count, estimated avoided bytes, and last read timestamp.

### Stale Diff

If the cache has a stale observation:

1. Re-evaluate policy against current actual size.
2. If refused, return a refusal.
3. Extract the current outline from the same snapshot.
4. Diff stale outline against current outline.
5. Record the new observation.
6. Return the existing `diff` projection.

### First Read

If no cache decision applies:

1. Call the lower `safeRead` operation with the current snapshot content.
2. Return its content, outline, refusal, or error projection.
3. Record cache only for content or outline projections on supported
   files.

## Surface Translators

### `RepoWorkspace.safeRead`

The library method keeps its current signature and result union.

It should only:

- resolve the workspace path
- create the governed-read dependencies from workspace fields
- call the service
- return the result shape already documented by the public API

### MCP `safe_read`

The MCP handler keeps its current tool schema and result shape.

It should only:

- resolve the MCP path
- record path footprint
- call the governed-read service
- record metrics based on the service result
- record symbol footprint when outline data is returned
- wrap the result with `ctx.respond("safe_read", ...)`

Metrics are surface behavior, so they stay in MCP. The decision that a
read is a cache hit or diff belongs in the service.

## Public API Contract

This refactor is non-breaking.

Do not change:

- `RepoWorkspace.safeRead(args)`
- `RepoWorkspaceSafeReadResult`
- MCP `safe_read` tool name
- MCP `safe_read` input schema
- MCP `safe_read` output projection names:
  `content`, `outline`, `refused`, `error`, `cache_hit`, `diff`
- reason strings:
  `REREAD_UNCHANGED`, `CHANGED_SINCE_LAST_READ`,
  `UNSUPPORTED_LANGUAGE`
- receipt wrapping
- root exports in `docs/public-api.md`

The new service should remain internal unless a separate API design
decides to expose it as a minor-version addition.

## Anti-Sludge Compliance

This design follows `docs/ANTI_SLUDGE_TYPESCRIPT_POLICY.md` by requiring:

- a named application service instead of duplicated handler branches
- exact request and result types
- a discriminated result union
- small ports for policy, governor, snapshot, and cache collaborators
- no catch-all workspace context object
- no optional-property soup for result variants
- no public API expansion in the hardening slice

Do not move MCP concerns into operations. Receipts, MCP metrics, and
footprint recording stay in the MCP adapter.

## Test Plan

Before refactoring, add parity tests proving that MCP and library reads
agree on governed behavior:

- small content read
- large outline read
- unchanged cache hit
- changed stale diff
- refusal after policy recheck on cache hit
- refusal after policy recheck on stale diff
- unsupported language first read
- missing file error
- `.graftignore` refusal
- path traversal refusal remains enforced by each surface resolver

After extraction, add service-level tests for:

- one raw file read per governed read
- cache hit touches the observation once
- stale diff records the new outline
- refused reads do not record cache
- unsupported-language reads do not record outline cache
- outline extraction is skipped when a refusal is returned before
  structural data is needed

## Migration Order

1. Add parity coverage for current `RepoWorkspace.safeRead` and MCP
   `safe_read`.
2. Extract snapshot helpers without changing behavior.
3. Introduce the governed-read service behind one surface.
4. Move the second surface to the service.
5. Delete duplicated cache/diff branches from both adapters.
6. Split eager `CachedFile` outline work only after parity is green.

## Non-goals

- [ ] Change read thresholds or policy reasons.
- [ ] Change `.graftignore` semantics.
- [ ] Change MCP output schemas.
- [ ] Add a new public read API.
- [ ] Replace `ObservationCache`.
- [ ] Convert all file-outline or read-range logic in the same slice.
