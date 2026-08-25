---
title: "git-warp port for sequential major migrations"
legend: "CORE"
cycle: "CORE_git-warp-port-for-major-migrations"
source_backlog: "operator-directed git-warp v19.1.0 upgrade prerequisite"
---

# git-warp port for sequential major migrations

## Sponsors

- Human: repository operator
- Agent: implementation agent

## Hill

Before Graft changes its installed git-warp major version, every production
graph read and write crosses a Graft-owned `WarpGraphPort`. The concrete
`@git-stunts/git-warp` API, including construction, observers, queries,
traversal, patches, materialization, worldline reads, provenance reads, and
attached-content reads, remains inside one secondary adapter.

The public behavior of Graft stays unchanged. The purpose of this cycle is to
make the later v19 public-API cutover an adapter change rather than a
repository-wide rewrite.

## Changed assumption

The landed v0.7.0 design intentionally removed the earlier `WarpHandle` port.
At that time, git-warp was treated as stable domain infrastructure whose types
could flow directly through Graft. That assumption no longer holds:

1. Graft must execute the git-warp package's mandatory migrations in order:
   v16 to v17, v17 to v18, then v18 to v19.
2. Reaching v19 also requires adopting a new git-warp public API.
3. Graft's current direction demotes git-warp to legacy import and temporary
   fallback compatibility rather than making its API the Graft domain model.

This packet does not rewrite the historical design. It records the new
operator-directed prerequisite and the evidence that invalidates its API-flow
posture for the upcoming upgrade.

## Boundary

### Graft-owned port

`src/ports/warp.ts` owns the structural types and capabilities Graft consumes:

- observer apertures, bounded node/edge reads, traversal, and queries;
- atomic patch construction and attached-content writes;
- materialization and tick receipts;
- point-in-time node reads;
- provenance patch lookup; and
- attached-content metadata and bytes.

The port names only capabilities Graft currently exercises. It does not expose
`WarpApp`, `WarpCore`, `Observer`, `QueryBuilder`, `PatchBuilderV2`, or any
other package-owned type.

### git-warp adapter

`src/warp/open.ts` is the concrete secondary adapter. It may import
`@git-stunts/git-warp`, construct the v16 runtime, and wrap package-owned
objects behind the Graft port. `src/warp/plumbing.d.ts` remains an allowed
type-declaration bridge for the package's plumbing declaration.

No other production TypeScript module may import `@git-stunts/git-warp`.
Consumers may call only Graft-owned port methods, including when they receive
observer, query, traversal, patch, core, or worldline capabilities.

### Session routing

`WarpContext` continues to carry the session's graph capability and
`strandId`. Its graph member is typed as `WarpGraphPort`, never `WarpApp`.
The existing fail-closed behavior for non-null strands remains unchanged.

## Acceptance criteria

- [ ] `src/ports/warp.ts` defines the complete Graft-owned graph capability
      used by current production code.
- [ ] `openWarp()` returns `WarpGraphPort` and wraps every package-owned object
      that can perform a graph read or write.
- [ ] Every production import of `@git-stunts/git-warp` is confined to
      `src/warp/open.ts` or the declaration-only `src/warp/plumbing.d.ts`.
- [ ] MCP, CLI, local-history, indexing, structural query, churn, timeline,
      and precision paths use only the port.
- [ ] Existing graph behavior remains green, including patching,
      materialization, bounded observation, traversal, aggregation,
      point-in-time reads, provenance, and attached content.
- [ ] An executable import-boundary witness rejects static, type-only,
      `require()`, and dynamic imports from a production module outside the
      adapter allowance.
- [ ] The dependency declaration and lockfile still resolve git-warp 16.0.0;
      no package migration script runs in this cycle.

## Playback questions

### Human

- [ ] Can a reader find one Graft-owned contract for every graph capability
      used outside the adapter?
- [ ] Can a reader verify that the later v19 API change has one production
      integration point?
- [ ] Did the refactor preserve behavior rather than beginning a data or
      dependency migration early?

### Agent

- [ ] Does a production-source import census find no unauthorized
      `@git-stunts/git-warp` dependency?
- [ ] Can a fake `WarpGraphPort` exercise `WarpContext` without constructing a
      git-warp object?
- [ ] Do focused WARP, MCP local-history, and precision tests pass through the
      adapter-backed port?
- [ ] Do lint, typecheck, build, and the relevant repository test gate pass?

## RED strategy

1. Rewrite playback 0080 from its current "git-warp types flow directly"
   assertion to the new import and port authority invariant.
2. Add adapter contract coverage that exercises the returned port through a
   real disposable repository.
3. Capture RED before adding the port: the port file is absent, production
   modules import package types, and `WarpContext` exposes `WarpApp`.

## GREEN strategy

1. Define the smallest complete Graft structural types in
   `src/ports/warp.ts`.
2. Wrap v16 `WarpApp`, core, observer, query, traversal, patch, and worldline
   objects in `src/warp/open.ts`.
3. Replace every package type import with the corresponding Graft port type.
4. Route the remaining direct core/worldline reads through the port.
5. Keep the stable external behavior and existing persistence configuration.

## Non-goals

- [ ] Changing `@git-stunts/git-warp` from 16.0.0.
- [ ] Running any v16-to-v17, v17-to-v18, or v18-to-v19 migration.
- [ ] Designing the migration-script rehearsal, backup, or live-data rollout.
- [ ] Adopting the v19 public API in this cycle.
- [ ] Expanding `StructuralReadingPort` or translating git-warp facts into
      Echo.
- [ ] Reintroducing the old lossy five-method `WarpHandle` unchanged.
- [ ] Changing public CLI, API, MCP, graph schema, or evidence semantics.

## Completion boundary

This cycle is complete when git-warp 16.0.0 behavior is preserved, all
production reads and writes cross the new port/adapter boundary, the boundary
has an executable negative witness, the relevant gates are green, and the
local Retro is committed. Only then may the v16-to-v17 migration cycle begin.
