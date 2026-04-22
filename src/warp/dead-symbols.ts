/**
 * Dead Symbol Detection — find symbols removed and never re-added.
 *
 * A symbol is "dead" when it existed at one tick but is absent at a
 * later tick and never reappears. This identifies cleanup candidates,
 * tracks deprecations, and measures API surface shrinkage.
 *
 * Uses the WARP graph's temporal observer to compare symbol snapshots
 * across ticks. Walks commits in tick order, detects removals by
 * diff, then filters out any symbol that reappears later.
 */

import type { WarpHandle, WarpObserverLens } from "../ports/warp.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A symbol that was removed and never re-added. */
export interface DeadSymbol {
  /** The symbol name (e.g. "myFunction"). */
  readonly name: string;
  /** The kind of symbol (e.g. "function", "class"). */
  readonly kind: string;
  /** The file path the symbol belonged to. */
  readonly filePath: string;
  /** Whether the symbol was exported. */
  readonly exported: boolean;
  /** The commit SHA that removed the symbol. */
  readonly removedInCommit: string;
}

/** Options for the dead-symbol query. */
export interface DeadSymbolOptions {
  /** Limit the search to the last N commits (by tick order). */
  readonly maxCommits?: number | undefined;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Extract the file path from a sym node id like "sym:path/to/file.ts:symbolName". */
function filePathFromSymId(symId: string): string {
  const withoutPrefix = symId.slice("sym:".length);
  const lastColon = withoutPrefix.lastIndexOf(":");
  if (lastColon === -1) {
    return withoutPrefix;
  }
  return withoutPrefix.slice(0, lastColon);
}

const SYM_LENS: WarpObserverLens = {
  match: "sym:*",
  expose: ["name", "kind", "signature", "exported"],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Find symbols that were removed and never re-added.
 *
 * For each commit in tick order, compares the sym-node set at tick-1
 * vs tick to find removals (present before, absent after). Then checks
 * if each removed symbol reappears at any later tick. Symbols that
 * never reappear are dead.
 */
export async function findDeadSymbols(
  warp: WarpHandle,
  options?: DeadSymbolOptions,
): Promise<DeadSymbol[]> {
  // Discover all commit nodes and read their ticks.
  const commitLens: WarpObserverLens = {
    match: "commit:*",
    expose: ["sha", "tick"],
  };
  const commitObs = await warp.observer(commitLens);
  const commitNodeIds = await commitObs.getNodes();

  const commits: { id: string; sha: string; tick: number }[] = [];
  for (const id of commitNodeIds) {
    const props = await commitObs.getNodeProps(id);
    const tick = typeof props?.["tick"] === "number" ? props["tick"] : null;
    if (tick === null) continue;
    const sha = typeof props?.["sha"] === "string"
      ? props["sha"]
      : id.slice("commit:".length);
    commits.push({ id, sha, tick });
  }

  // Sort by tick ascending.
  commits.sort((a, b) => a.tick - b.tick);

  if (commits.length === 0) return [];

  // Apply maxCommits limit — scope to the last N commits.
  const limit = options?.maxCommits;
  const scopedCommits = limit !== undefined && limit > 0
    ? commits.slice(-limit)
    : commits;

  // For each scoped commit, detect removals by diffing sym nodes
  // at tick-1 vs tick.
  // Track: symId → { sha, tick } for removed symbols.
  // If a symbol reappears at a later tick, remove it from the map.
  const removals = new Map<string, { sha: string; tick: number }>();

  for (const commit of scopedCommits) {
    if (commit.tick <= 1) continue;

    const [beforeObs, afterObs] = await Promise.all([
      warp.observer(SYM_LENS, { source: { kind: "live", ceiling: commit.tick - 1 } }),
      warp.observer(SYM_LENS, { source: { kind: "live", ceiling: commit.tick } }),
    ]);

    const [beforeNodes, afterNodes] = await Promise.all([
      beforeObs.getNodes(),
      afterObs.getNodes(),
    ]);

    const afterSet = new Set(afterNodes);
    const beforeSet = new Set(beforeNodes);

    // Symbols present before but absent after = removed in this commit.
    for (const symId of beforeNodes) {
      if (!afterSet.has(symId)) {
        removals.set(symId, { sha: commit.sha, tick: commit.tick });
      }
    }

    // Symbols absent before but present after = re-added in this commit.
    for (const symId of afterNodes) {
      if (!beforeSet.has(symId) && removals.has(symId)) {
        removals.delete(symId);
      }
    }
  }

  if (removals.size === 0) return [];

  // Read props for dead symbols from a ceiling just before removal.
  const dead: DeadSymbol[] = [];

  for (const [symId, removal] of removals) {
    const beforeObs = await warp.observer(SYM_LENS, {
      source: { kind: "live", ceiling: removal.tick - 1 },
    });

    const props = await beforeObs.getNodeProps(symId);
    const name = typeof props?.["name"] === "string" ? props["name"] : symId;
    const kind = typeof props?.["kind"] === "string" ? props["kind"] : "unknown";
    const exported = typeof props?.["exported"] === "boolean" ? props["exported"] : false;
    const filePath = filePathFromSymId(symId);

    dead.push({
      name,
      kind,
      filePath,
      exported,
      removedInCommit: removal.sha,
    });
  }

  return dead;
}
