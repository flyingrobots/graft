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

  // Detect removals by temporal diff.
  let removed: SymbolChange[] = [];
  if (tick !== null && tick > 1) {
    removed = await detectRemovals(ctx, tick);
  }

  return { sha: commitSha, added, removed, changed };
}

/**
 * Detect symbol removals via tick receipts.
 *
 * Instead of scanning all sym:* nodes at two ceilings (which assumes
 * the full graph fits in memory), we materialize with receipts and
 * inspect the receipt at the target tick for NodeTombstone ops on sym
 * nodes. O(ops in one patch), not O(all sym nodes).
 */
async function detectRemovals(
  ctx: WarpContext,
  tick: number,
): Promise<SymbolChange[]> {
  // Materialize up to this tick with receipts.
  const { receipts } = await ctx.app.core().materialize({ receipts: true, ceiling: tick });

  // Find the receipt for this tick's patch.
  const receipt = receipts.find((r) => r.lamport === tick);
  if (receipt === undefined) return [];

  // Tombstoned sym nodes = removals.
  const removedIds = receipt.ops
    .filter((op) => op.op === "NodeTombstone" && op.target.startsWith("sym:") && op.result === "applied")
    .map((op) => op.target);

  if (removedIds.length === 0) return [];

  // Read props from the pre-tick observer (nodes are gone at current tick).
  const symLens: Lens = {
    match: "sym:*",
    expose: ["name", "kind", "signature", "exported"],
  };
  const beforeObs = await observeGraph(ctx, symLens, { source: { kind: "live", ceiling: tick - 1 } });

  // Targeted per-node reads — bounded by removals in one commit.
  const changes: SymbolChange[] = [];
  for (const id of removedIds) {
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

/**
 * Given a symbol name (and optional file path), return all commits
 * that touched it.
 *
 * Uses QueryBuilder for pattern matching (find sym nodes by name),
 * then traverse.bfs per sym node for edge-following (find connected
 * commits). Per-node traversal preserves cardinality — the same commit
 * touching init in two files produces two results.
 */
/** @deprecated Use symbolTimeline() from ./symbol-timeline.ts instead.
 *  This function returns the HEAD signature for all entries, not the
 *  historical signature at each commit. symbolTimeline uses ceiling
 *  observers for accurate per-tick data. */
export async function commitsForSymbol(
  ctx: WarpContext,
  symbolName: string,
  filePath?: string,
): Promise<SymbolHistory> {
  const obs = await observeGraph(ctx, commitSymbolLens());

  // Pattern match: find sym nodes matching the name.
  const symPattern = filePath !== undefined
    ? `sym:${filePath}:${symbolName}`
    : `sym:*:${symbolName}`;

  const symResult = await obs.query()
    .match(symPattern)
    .select(["id", "props"])
    .run() as QueryResultV1;

  const symNodes = symResult.nodes.filter(
    (n): n is { id: string; props?: Record<string, unknown> } =>
      n.id?.startsWith("sym:") === true,
  );

  // Per sym node, traverse incoming edges by label to find commits.
  const edgeLabels: readonly { label: string; changeKind: ChangeKind }[] = [
    { label: "adds", changeKind: "added" },
    { label: "changes", changeKind: "changed" },
    { label: "removes", changeKind: "removed" },
  ];

  const commits: SymbolCommit[] = [];

  for (const symNode of symNodes) {
    const symProps = symNode.props ?? {};
    const signature = typeof symProps["signature"] === "string"
      ? symProps["signature"]
      : undefined;

    for (const { label, changeKind } of edgeLabels) {
      const commitIds = await obs.traverse.bfs(symNode.id, {
        dir: "in",
        labelFilter: label,
        maxDepth: 1,
      });

      for (const commitId of commitIds) {
        if (!commitId.startsWith("commit:")) continue;
        const sha = commitId.slice("commit:".length);
        commits.push({ sha, changeKind, signature });
      }
    }
  }

  return {
    symbol: symbolName,
    filePath,
    commits,
  };
}
