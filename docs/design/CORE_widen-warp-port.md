---
title: "widen warp port — kill WarpHandle, use git-warp directly"
legend: "CORE"
cycle: "CORE_widen-warp-port"
source_backlog: "docs/method/backlog/v0.7.0/CORE_widen-warp-port.md"
---

# widen warp port — kill WarpHandle, use git-warp directly

Source backlog item: `docs/method/backlog/v0.7.0/CORE_widen-warp-port.md`
Legend: CORE

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

## Hill

By the end of this cycle, graft's application and domain code imports
types from `@git-stunts/git-warp` directly — `WarpApp`, `Observer`,
`Worldline`, `PatchBuilderV2`, `QueryBuilder`, `Lens`, strands — instead
of passing through a lossy `WarpHandle` port interface.

The only adapter-layer code is `openWarp()` in `src/warp/open.ts`, which
wires persistence and config. After construction, git-warp types flow
freely as domain infrastructure.

A thin `WarpContext` DI bag carries the open `WarpApp` plus an optional
`strandId` for multi-agent session isolation.

## Rationale

1. **git-warp is domain infrastructure, not external I/O.** It's the
   graph substrate graft exists to operate on — like a CRDT library in a
   collaborative editor. Wrapping it in a port doesn't add testability
   (git-warp provides `InMemoryGraphAdapter`) or swappability (nobody
   will swap the substrate).

2. **The port is a capability bottleneck.** Every time graft needs
   `query()`, `worldline()`, `subscribe()`, `traverse`, or strands, the
   port must be widened. The port doesn't protect — it prevents.

3. **Strands are the multi-agent primitive.** git-warp v16 provides
   `createStrand`, `patchStrand`, `materializeStrand`, `compareStrand`,
   `planStrandTransfer`. Building a graft-side "agent session port" over
   this would reinvent what the substrate already models natively.

4. **Anti-sludge alignment.** The port created translation overhead
   (`toRawLens`, `toRawObserverOptions`) that copies fields around with
   no semantic gain. That's sludge masquerading as architecture.

## Design

### WarpContext (DI bag)

```typescript
// src/warp/context.ts
import type WarpApp from "@git-stunts/git-warp";

export interface WarpContext {
  readonly app: WarpApp;
  readonly strandId: string | null; // null = live writes, string = strand-isolated
}
```

Not a port. Not an interface to implement. A typed record that carries
session routing info.

### openWarp (adapter — the only boundary)

```typescript
// src/warp/open.ts — stays as the adapter
import WarpApp, { GitGraphAdapter } from "@git-stunts/git-warp";
import GitPlumbing from "@git-stunts/plumbing";

export async function openWarp(options: OpenWarpOptions): Promise<WarpApp> {
  const plumbing = GitPlumbing.createDefault({ cwd: options.cwd });
  const persistence = new GitGraphAdapter({ plumbing });
  return WarpApp.open({
    persistence,
    graphName: GRAPH_NAME,
    writerId: options.writerId ?? DEFAULT_WARP_WRITER_ID,
    onDeleteWithData: "cascade",
  });
}
```

Returns `WarpApp` directly. No wrapping.

### Consumer pattern (reads)

```typescript
import type { Observer, Lens } from "@git-stunts/git-warp";

async function referencesForSymbol(app: WarpApp, symbolName: string, filePath: string) {
  const obs = await app.observer({ match: ["ast:*", "file:*", "sym:*"] });
  const edges = await obs.getEdges();
  // ...
}
```

### Consumer pattern (writes)

```typescript
import { patchGraph } from "../warp/context.js";

function writeAst(ctx: WarpContext, filePath: string, root: TSNode): Promise<string> {
  return patchGraph(ctx, (patch) => { /* ... */ });
}
```

### Strand routing (no-op today, hooks in place)

```typescript
// src/warp/context.ts
import type WarpApp from "@git-stunts/git-warp";
import type { PatchBuilderV2 } from "@git-stunts/git-warp";

export interface WarpContext {
  readonly app: WarpApp;
  readonly strandId: string | null;
}

export function patchGraph(
  ctx: WarpContext,
  build: (patch: PatchBuilderV2) => void | Promise<void>,
): Promise<string> {
  if (ctx.strandId !== null) {
    throw new Error(
      `Strand isolation not yet supported (strandId: ${ctx.strandId}). ` +
      `git-warp strand merging is not ready.`,
    );
  }
  return ctx.app.patch(build);
}
```

When git-warp strand merging lands, the guard becomes:
```typescript
return ctx.app.patchStrand(ctx.strandId, build);
```

### WarpPool update

```typescript
// src/mcp/warp-pool.ts
import type WarpApp from "@git-stunts/git-warp";

export interface WarpPool {
  getOrOpen(repoId: string, worktreeRoot: string, writerId?: string): Promise<WarpApp>;
  size(): number;
}
```

### What gets deleted

- `src/ports/warp.ts` — the entire file
- `wrapWarpApp()` in `src/warp/open.ts`
- `toRawLens()` and `toRawObserverOptions()` in `src/warp/open.ts`
- Playback test `0080` assertions about `WarpHandle` (rewritten for new truth)

### What gets migrated (20 files)

Every file that imports from `../ports/warp.js` switches to importing
from `@git-stunts/git-warp` directly:

| Port type | Replaced by |
|-----------|-------------|
| `WarpHandle` | `WarpApp` (or `WarpContext` where strand routing needed) |
| `WarpObserver` | `Observer` from git-warp |
| `WarpObserverLens` | `Lens` from git-warp |
| `WarpPatchBuilder` | `PatchBuilderV2` from git-warp |
| `WarpEdge` | inline `{ from: string; to: string; label: string }` (matches git-warp) |
| `WarpMaterializeReceipt` | `TickReceipt` from git-warp |

### Observers module stays

`src/warp/observers.ts` keeps its lens factory functions. They return
`Lens` (re-exported from git-warp) and remain the canonical place for
graft's named apertures. The `observe()` helper becomes:

```typescript
export function observe(app: WarpApp, lens: Lens): Promise<Observer> {
  return app.observer(lens);
}
```

## Playback Questions

### Human

- [ ] Can a human see that `src/ports/warp.ts` no longer exists and
      that git-warp types flow directly through application code?
- [ ] Can a human confirm that `openWarp()` is the sole construction
      adapter — the only file that wires `GitGraphAdapter` + `GitPlumbing`?
- [ ] Can a human see that multi-agent isolation is modeled via
      `strandId` in `WarpContext`, routing to git-warp's native strand API?
- [ ] Is it clear where a second agent would plug in (create strand,
      pass `WarpContext` with strandId, writes route through `patchStrand`)?

### Agent

- [ ] Do all tests pass after the migration?
- [ ] Does `pnpm lint` pass with zero warnings?
- [ ] Does no file outside `src/warp/open.ts` import `GitGraphAdapter`
      or `GitPlumbing`?
- [ ] Does the playback test mechanically prove the new boundary?

## Test Plan

### Golden path

1. **Port deletion compiles** — delete `src/ports/warp.ts`, migrate all
   imports, `tsc --noEmit` passes.
2. **openWarp returns WarpApp** — unit test confirms return type, graph
   name, writer ID.
3. **WarpContext routes writes** — with `strandId: null`, `patch()` is
   called; with `strandId: "test-strand"`, `patchGraph()` throws
   explicit "not yet supported" error.
4. **Observer reads work unchanged** — existing warp query tests pass
   with `Observer` from git-warp replacing `WarpObserver`.
5. **WarpPool vends WarpApp** — pool caches by (repoId, writerId),
   returns same instance on second call.

### Edge cases

- `WarpContext` with `strandId` set → throws explicit "not yet
  supported" error. Strand routing hooks exist but fail-closed until
  git-warp strand merging is ready.
- Two agents with same `writerId` but different `strandId` — future
  valid case, currently unreachable (single agent enforced).
- `openWarp` failure (corrupt `.git`) — error propagates cleanly, no
  partial WarpApp state.

### Known failure modes

- Type incompatibility between git-warp's `Record<string, unknown>` in
  `getNodeProps` and graft code that reads specific keys — this is
  already the case today, no regression.
- Playback test `0080` will fail immediately (expected — it asserts the
  old boundary). Must be rewritten as part of this cycle.

## Drift risk

- If git-warp v17 changes `WarpApp` or `Observer` signatures, graft
  takes the break directly. Acceptable: same org, version-locked, and
  the port wasn't protecting us from this anyway (we'd have to mirror
  the change in the port too).
