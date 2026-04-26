/**
 * WARP Structural Query Helpers — commit-symbol traversals.
 *
 * Shared infrastructure for graft log, graft blame, and graft churn.
 * Uses traverse for edge-following and QueryBuilder for pattern matching
 * and batch prop reads. No getEdges() — filtering stays substrate-side.
 */

import type { Lens, QueryResultV1 } from "@git-stunts/git-warp";
import type { WarpContext } from "./context.js";
import { observeGraph } from "./context.js";
import { symbolTimeline } from "./symbol-timeline.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A symbol that was added, removed, or changed in a commit. */
export interface SymbolChange {
  readonly name: string;
  readonly kind: string;
  readonly signature?: string | undefined;
  readonly exported: boolean;
  readonly filePath: string;
}

/** All symbol changes for a single commit. */
export interface CommitSymbols {
  readonly sha: string;
  readonly added: readonly SymbolChange[];
  readonly removed: readonly SymbolChange[];
  readonly changed: readonly SymbolChange[];
}

/** The kind of change a commit made to a symbol. */
export type ChangeKind = "added" | "removed" | "changed";

/** A single commit entry in a symbol's history. */
export interface SymbolCommit {
  readonly sha: string;
  readonly changeKind: ChangeKind;
  readonly signature?: string | undefined;
}

/** Full change history for a symbol across commits. */
export interface SymbolHistory {
  readonly symbol: string;
  readonly filePath?: string | undefined;
  readonly commits: readonly SymbolCommit[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Lens that spans both commit and symbol nodes so the observer
 * can see the edges between them.
 */
function commitSymbolLens(): Lens {
  return {
    match: ["commit:*", "sym:*"],
    expose: ["sha", "name", "kind", "signature", "exported"],
  };
}

function filePathFromSymId(symId: string): string {
  const withoutPrefix = symId.slice("sym:".length);
  const lastColon = withoutPrefix.lastIndexOf(":");
  if (lastColon === -1) {
    return withoutPrefix;
  }
  return withoutPrefix.slice(0, lastColon);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Given a commit SHA, return all symbols that were added, removed,
 * or changed in that commit.
 *
 * Uses traverse for edge-following (substrate-side), then QueryBuilder
 * for batch prop reads. Removals are detected by temporal diff at
 * tick N-1 vs tick N.
 */
export async function symbolsForCommit(
  ctx: WarpContext,
  commitSha: string,
): Promise<CommitSymbols> {
  const commitId = `commit:${commitSha}`;

  // Read the commit's tick for removal detection.
  const commitObs = await observeGraph(ctx,
    { match: commitId, expose: ["tick"] },
  );
  const commitProps = await commitObs.getNodeProps(commitId);
  const tick = typeof commitProps?.["tick"] === "number" ? commitProps["tick"] : null;

  // Observer scoped to commit + symbol nodes.
  const obs = await observeGraph(ctx, commitSymbolLens());

  // Check if the commit node exists before traversing.
  const commitExists = await obs.hasNode(commitId);
  if (!commitExists) {
    return { sha: commitSha, added: [], removed: [], changed: [] };
  }

  // Traverse: follow outgoing edges from this commit by label.
  const [addedIds, changedIds] = await Promise.all([
    obs.traverse.bfs(commitId, { dir: "out", labelFilter: "adds", maxDepth: 1 }),
    obs.traverse.bfs(commitId, { dir: "out", labelFilter: "changes", maxDepth: 1 }),
  ]);

  // Batch prop read for discovered sym nodes.
  const allSymIds = [...addedIds, ...changedIds].filter((id) => id.startsWith("sym:"));

  const symPropsMap = new Map<string, Record<string, unknown>>();
  if (allSymIds.length > 0) {
    const propsResult = await obs.query()
      .match(allSymIds)
      .select(["id", "props"])
      .run() as QueryResultV1;
    for (const node of propsResult.nodes) {
      if (node.id !== undefined && node.props !== undefined) {
        symPropsMap.set(node.id, node.props);
      }
    }
  }

  function toSymbolChange(symId: string): SymbolChange {
    const props = symPropsMap.get(symId) ?? {};
    const name = typeof props["name"] === "string" ? props["name"] : symId;
    const kind = typeof props["kind"] === "string" ? props["kind"] : "unknown";
    const signature = typeof props["signature"] === "string" ? props["signature"] : undefined;
    const exported = typeof props["exported"] === "boolean" ? props["exported"] : false;
    const filePath = filePathFromSymId(symId);
    return { name, kind, signature, exported, filePath };
  }

  const added = addedIds.filter((id) => id.startsWith("sym:")).map(toSymbolChange);
  const changed = changedIds.filter((id) => id.startsWith("sym:")).map(toSymbolChange);

  // Detect removals by temporal receipts across the Git commit's indexed
  // Lamport window. Lazy indexing can write one WARP patch per file, so one
  // Git commit may span multiple Lamport ticks.
  let removed: SymbolChange[] = [];
  if (tick !== null) {
    removed = await detectRemovals(ctx, await previousCommitTick(ctx, commitSha, tick), tick);
  }

  return { sha: commitSha, added, removed, changed };
}

async function previousCommitTick(
  ctx: WarpContext,
  commitSha: string,
  tick: number,
): Promise<number> {
  const obs = await observeGraph(ctx, { match: "commit:*", expose: ["sha", "tick"] });
  const nodeIds = await obs.getNodes();
  let previous = 0;

  for (const nodeId of nodeIds) {
    const props = await obs.getNodeProps(nodeId);
    const sha = typeof props?.["sha"] === "string"
      ? props["sha"]
      : nodeId.slice("commit:".length);
    if (sha === commitSha) continue;

    const candidate = typeof props?.["tick"] === "number" ? props["tick"] : null;
    if (candidate !== null && candidate < tick && candidate > previous) {
      previous = candidate;
    }
  }

  return previous;
}

/**
 * Detect symbol removals via tick receipts.
 *
 * Instead of scanning all sym:* nodes at two ceilings (which assumes
 * the full graph fits in memory), we materialize with receipts and inspect
 * receipts in one Git commit's indexed Lamport window for NodeTombstone ops
 * on sym nodes. O(ops in indexed file patches), not O(all sym nodes).
 */
async function detectRemovals(
  ctx: WarpContext,
  previousTick: number,
  tick: number,
): Promise<SymbolChange[]> {
  // Use latest materialization and filter receipts locally. A ceiling
  // materialization on the shared core would leave the app cached at an old
  // tick, corrupting later live reads in the same operation.
  const { receipts } = await ctx.app.core().materialize({ receipts: true });

  const scopedReceipts = receipts.filter((receipt) =>
    receipt.lamport > previousTick && receipt.lamport <= tick,
  );
  if (scopedReceipts.length === 0) return [];

  // Tombstoned sym nodes = removals.
  const removed = new Map<string, number>();
  for (const receipt of scopedReceipts) {
    for (const op of receipt.ops) {
      if (op.op === "NodeTombstone" && op.target.startsWith("sym:") && op.result === "applied") {
        removed.set(op.target, receipt.lamport);
      }
    }
  }

  if (removed.size === 0) return [];

  // Read props from the pre-removal observer (nodes are gone at current tick).
  const symLens: Lens = {
    match: "sym:*",
    expose: ["name", "kind", "signature", "exported"],
  };

  // Targeted per-node reads — bounded by removals in one commit.
  const changes: SymbolChange[] = [];
  for (const [id, removalTick] of removed) {
    const beforeObs = await observeGraph(ctx, symLens, {
      source: { kind: "live", ceiling: removalTick - 1 },
    });
    const props = await beforeObs.getNodeProps(id);
    if (props === null) continue;

    const name = typeof props["name"] === "string" ? props["name"] : id;
    const kind = typeof props["kind"] === "string" ? props["kind"] : "unknown";
    const signature = typeof props["signature"] === "string" ? props["signature"] : undefined;
    const exported = typeof props["exported"] === "boolean" ? props["exported"] : false;
    const filePath = filePathFromSymId(id);

    changes.push({ name, kind, signature, exported, filePath });
  }
  return changes;
}

/** @deprecated Use symbolTimeline() from ./symbol-timeline.ts instead. */
export async function commitsForSymbol(
  ctx: WarpContext,
  symbolName: string,
  filePath?: string,
): Promise<SymbolHistory> {
  const timeline = await symbolTimeline(ctx, symbolName, filePath);
  return {
    symbol: symbolName,
    filePath,
    commits: timeline.versions.map((version) => ({
      sha: version.sha,
      changeKind: version.changeKind,
      signature: version.signature,
    })),
  };
}
