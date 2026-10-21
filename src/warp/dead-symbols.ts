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

import type { Lens } from "@git-stunts/git-warp";
import { observeGraph, type WarpContext } from "./context.js";
import { SymIdCodec } from "./sym-id-codec.js";
import type {
  ObservedIndexHistoryGap,
  ObservedIndexHistoryTerms,
} from "../ports/structural-reading.js";

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
  /** The last examined index boundary (commit SHA) where the symbol existed. */
  readonly lastObservedPresentAt: string;
  /**
   * The first examined index boundary (commit SHA) where the symbol was
   * absent. The removal happened after `lastObservedPresentAt` and at or
   * before this boundary; this is not necessarily the commit that removed it.
   */
  readonly firstObservedAbsentAt: string;
}

const OBSERVED_INDEX_HISTORY_GAPS: readonly ObservedIndexHistoryGap[] = Object.freeze([
  "changes-between-boundaries",
  "history-before-earliest-boundary",
]);

/** Options for the dead-symbol query. */
export interface DeadSymbolOptions {
  /** Limit the search to the last N commits (by tick order). */
  readonly maxCommits?: number | undefined;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function filePathFromSymId(symId: string): string | null {
  return SymIdCodec.filePath(symId);
}

const SYM_LENS: Lens = {
  match: "sym:*",
  expose: ["name", "kind", "signature", "exported"],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

interface IndexBoundary {
  readonly id: string;
  readonly sha: string;
  readonly tick: number;
}

/** Indexed commit boundaries in tick order. */
async function listIndexBoundaries(ctx: WarpContext): Promise<IndexBoundary[]> {
  const commitLens: Lens = {
    match: "commit:*",
    expose: ["sha", "tick"],
  };
  const commitObs = await observeGraph(ctx, commitLens);
  const commitNodeIds = await commitObs.getNodes();

  const commits: IndexBoundary[] = [];
  for (const id of commitNodeIds) {
    const props = await commitObs.getNodeProps(id);
    const tick = typeof props?.["tick"] === "number" ? props["tick"] : null;
    if (tick === null) continue;
    const sha = typeof props?.["sha"] === "string"
      ? props["sha"]
      : id.slice("commit:".length);
    commits.push({ id, sha, tick });
  }

  commits.sort((a, b) => a.tick - b.tick);
  return commits;
}

function scopeBoundaries(commits: readonly IndexBoundary[], options?: DeadSymbolOptions): readonly IndexBoundary[] {
  const limit = options?.maxCommits;
  return limit !== undefined && limit > 0 ? commits.slice(-limit) : commits;
}

/**
 * Describe the history a dead-symbol query with these options examines.
 */
export async function readObservedIndexHistory(
  ctx: WarpContext,
  options?: DeadSymbolOptions,
): Promise<ObservedIndexHistoryTerms> {
  const commits = await listIndexBoundaries(ctx);
  const scoped = scopeBoundaries(commits, options);
  const firstScoped = scoped[0];
  const firstScopedIndex = firstScoped === undefined ? -1 : commits.indexOf(firstScoped);
  const before = firstScopedIndex > 0 ? commits[firstScopedIndex - 1] : undefined;
  const earliest = before ?? firstScoped;
  const latest = scoped.at(-1);
  return {
    domain: "observed-index-history",
    indexedBoundaries: commits.length,
    examinedBoundaries: scoped.length + (before === undefined ? 0 : 1),
    earliestExamined: earliest?.sha ?? null,
    latestExamined: latest?.sha ?? null,
    limitedByMaxCommits: scoped.length < commits.length,
    unobserved: OBSERVED_INDEX_HISTORY_GAPS,
  };
}

/**
 * Find symbols that were removed and never re-added.
 *
 * For each commit in tick order, compares the sym-node set at the previous
 * indexed commit tick vs this commit's tick to find removals (present before,
 * absent after). A single Git commit can span multiple WARP Lamport ticks
 * because lazy indexing writes one bounded patch per file. A removal is
 * located between two observed boundaries; changes between boundaries are
 * not seen.
 */
export async function findDeadSymbols(
  ctx: WarpContext,
  options?: DeadSymbolOptions,
): Promise<DeadSymbol[]> {
  const commits = await listIndexBoundaries(ctx);
  if (commits.length === 0) return [];
  const scopedCommits = scopeBoundaries(commits, options);

  // For each scoped commit, detect removals by diffing sym nodes at the
  // previous indexed commit boundary vs this commit's boundary. Per-file lazy
  // index patches inside the same Git commit are deliberately treated as one
  // commit window.
  // Track removed symbols with the pre-removal boundary needed to recover props.
  // If a symbol reappears at a later tick, remove it from the map.
  const removals = new Map<string, { sha: string; presentSha: string; beforeTick: number }>();

  for (const commit of scopedCommits) {
    const commitIndex = commits.indexOf(commit);
    const previousCommit = commitIndex > 0 ? commits[commitIndex - 1] : undefined;
    const beforeTick = commitIndex > 0
      ? previousCommit?.tick ?? 0
      : 0;

    const [beforeObs, afterObs] = await Promise.all([
      observeGraph(ctx, SYM_LENS, { source: { kind: "live", ceiling: beforeTick } }),
      observeGraph(ctx, SYM_LENS, { source: { kind: "live", ceiling: commit.tick } }),
    ]);

    const [beforeNodes, afterNodes] = await Promise.all([
      beforeObs.getNodes(),
      afterObs.getNodes(),
    ]);

    const afterSet = new Set(afterNodes);
    const beforeSet = new Set(beforeNodes);

    // Symbols present before but absent after = removed after the previous
    // boundary and at or before this one.
    if (previousCommit !== undefined) {
      for (const symId of beforeNodes) {
        if (!afterSet.has(symId)) {
          removals.set(symId, { sha: commit.sha, presentSha: previousCommit.sha, beforeTick });
        }
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
    const beforeObs = await observeGraph(ctx, SYM_LENS, {
      source: { kind: "live", ceiling: removal.beforeTick },
    });

    const props = await beforeObs.getNodeProps(symId);
    const name = typeof props?.["name"] === "string" ? props["name"] : symId;
    const kind = typeof props?.["kind"] === "string" ? props["kind"] : "unknown";
    const exported = typeof props?.["exported"] === "boolean" ? props["exported"] : false;
    const filePath = filePathFromSymId(symId);
    if (filePath === null) continue;

    dead.push({
      name,
      kind,
      filePath,
      exported,
      lastObservedPresentAt: removal.presentSha,
      firstObservedAbsentAt: removal.sha,
    });
  }

  return dead;
}
