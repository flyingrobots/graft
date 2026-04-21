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

/** Extract a SymbolChange from a query result node. */
function nodeToSymbolChange(node: { id?: string; props?: Record<string, unknown> }): SymbolChange | null {
  if (!node.id?.startsWith("sym:")) return null;
  const id = node.id;

  const props = node.props ?? {};
  const name = typeof props["name"] === "string" ? props["name"] : id;
  const kind = typeof props["kind"] === "string" ? props["kind"] : "unknown";
  const signature = typeof props["signature"] === "string" ? props["signature"] : undefined;
  const exported = typeof props["exported"] === "boolean" ? props["exported"] : false;
  const filePath = filePathFromSymId(id);

  return { name, kind, signature, exported, filePath };
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
 * Detect symbol removals by comparing the symbol snapshot at
 * tick-1 (before the commit) vs tick (after the commit).
 * Symbols present at tick-1 but absent at tick were removed.
 */
async function detectRemovals(
  ctx: WarpContext,
  tick: number,
): Promise<SymbolChange[]> {
  const symLens: Lens = {
    match: "sym:*",
    expose: ["name", "kind", "signature", "exported"],
  };

  const [beforeObs, afterObs] = await Promise.all([
    observeGraph(ctx, symLens, { source: { kind: "live", ceiling: tick - 1 } }),
    observeGraph(ctx, symLens, { source: { kind: "live", ceiling: tick } }),
  ]);

  // Query both snapshots for sym node IDs + props.
  const [beforeResult, afterResult] = await Promise.all([
    beforeObs.query().match("sym:*").select(["id", "props"]).run() as Promise<QueryResultV1>,
    afterObs.query().match("sym:*").select(["id"]).run() as Promise<QueryResultV1>,
  ]);

  const afterIds = new Set(
    afterResult.nodes.map((n) => n.id).filter((id): id is string => id !== undefined),
  );

  // Removed = present before, absent after. Props come from before-result.
  const changes: SymbolChange[] = [];
  for (const node of beforeResult.nodes) {
    if (node.id === undefined || afterIds.has(node.id)) continue;
    const change = nodeToSymbolChange(node);
    if (change !== null) changes.push(change);
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
