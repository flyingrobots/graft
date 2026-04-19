/**
 * WARP Structural Query Helpers — commit-symbol traversals.
 *
 * Shared infrastructure for graft log, graft blame, and graft churn.
 * These functions read the WARP graph through observer lenses,
 * never walking the graph directly.
 */

import type { WarpEdge, WarpHandle, WarpObserverLens } from "../ports/warp.js";
import { observe } from "./observers.js";

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

const CHANGE_LABELS = new Set(["adds", "removes", "changes"]);

/**
 * Lens that spans both commit and symbol nodes so the observer
 * can see the edges between them.
 */
function commitSymbolLens(): WarpObserverLens {
  return {
    match: ["commit:*", "sym:*"],
    expose: ["sha", "name", "kind", "signature", "exported"],
  };
}

function labelToChangeKind(label: string): ChangeKind {
  switch (label) {
    case "adds": return "added";
    case "removes": return "removed";
    case "changes": return "changed";
    default: throw new Error(`Unknown edge label: ${label}`);
  }
}

function filePathFromSymId(symId: string): string {
  // sym:<filepath>:<symbolPath>
  // The symbol path may itself contain ":" so we split at the first and
  // last ":" after the prefix.
  const withoutPrefix = symId.slice("sym:".length);
  const lastColon = withoutPrefix.lastIndexOf(":");
  if (lastColon === -1) {
    return withoutPrefix;
  }
  return withoutPrefix.slice(0, lastColon);
}

/** Read symbol properties from an observer that already covers sym:* nodes. */
async function readSymbolChange(
  obs: { getNodeProps(nodeId: string): Promise<Record<string, unknown> | null> },
  symId: string,
): Promise<SymbolChange> {
  const props = await obs.getNodeProps(symId);

  const name = typeof props?.["name"] === "string" ? props["name"] : symId;
  const kind = typeof props?.["kind"] === "string" ? props["kind"] : "unknown";
  const signature = typeof props?.["signature"] === "string" ? props["signature"] : undefined;
  const exported = typeof props?.["exported"] === "boolean" ? props["exported"] : false;
  const filePath = filePathFromSymId(symId);

  return { name, kind, signature, exported, filePath };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Given a commit SHA, return all symbols that were added, removed,
 * or changed in that commit.
 *
 * Uses the observer lens system — reads edges from the commit node
 * to symbol nodes via `adds` and `changes` edge labels. Removals are
 * detected by comparing symbol snapshots at tick N-1 and tick N,
 * because the graph deletes removed symbol nodes (making `removes`
 * edges invisible to observers).
 */
export async function symbolsForCommit(
  warp: WarpHandle,
  commitSha: string,
): Promise<CommitSymbols> {
  const commitId = `commit:${commitSha}`;

  // Read the commit's tick from its node props.
  const commitObs = await warp.observer(
    { match: commitId, expose: ["tick"] },
  );
  const commitProps = await commitObs.getNodeProps(commitId);
  const tick = typeof commitProps?.["tick"] === "number" ? commitProps["tick"] : null;

  // Observe commit + symbol nodes so edges between them are visible.
  const csObs = await observe(warp, commitSymbolLens());
  const edges = await csObs.getEdges();

  // Collect sym node IDs for adds and changes (these edges survive).
  const addedIds: string[] = [];
  const changedIds: string[] = [];

  for (const edge of edges) {
    if (edge.from !== commitId) continue;
    if (!edge.to.startsWith("sym:")) continue;
    if (edge.label === "adds") addedIds.push(edge.to);
    else if (edge.label === "changes") changedIds.push(edge.to);
  }

  const [added, changed] = await Promise.all([
    Promise.all(addedIds.map((id) => readSymbolChange(csObs, id))),
    Promise.all(changedIds.map((id) => readSymbolChange(csObs, id))),
  ]);

  // Detect removals by diffing symbol snapshots at tick-1 vs tick.
  let removed: SymbolChange[] = [];
  if (tick !== null && tick > 1) {
    removed = await detectRemovals(warp, tick);
  }

  return { sha: commitSha, added, removed, changed };
}

/**
 * Detect symbol removals by comparing the symbol snapshot at
 * tick-1 (before the commit) vs tick (after the commit).
 * Symbols present at tick-1 but absent at tick were removed.
 */
async function detectRemovals(
  warp: WarpHandle,
  tick: number,
): Promise<SymbolChange[]> {
  const symLens: WarpObserverLens = {
    match: "sym:*",
    expose: ["name", "kind", "signature", "exported"],
  };

  const [beforeObs, afterObs] = await Promise.all([
    warp.observer(symLens, { source: { kind: "live", ceiling: tick - 1 } }),
    warp.observer(symLens, { source: { kind: "live", ceiling: tick } }),
  ]);

  const [beforeNodes, afterNodes] = await Promise.all([
    beforeObs.getNodes(),
    afterObs.getNodes(),
  ]);

  const afterSet = new Set(afterNodes);
  const removedIds = beforeNodes.filter((id) => !afterSet.has(id));

  return Promise.all(removedIds.map((id) => readSymbolChange(beforeObs, id)));
}

/**
 * Given a symbol name (and optional file path), return all commits
 * that touched it.
 *
 * Walks edges backward from commit nodes to find those that point
 * to matching symbol nodes via `adds`, `removes`, or `changes` labels.
 */
export async function commitsForSymbol(
  warp: WarpHandle,
  symbolName: string,
  filePath?: string,
): Promise<SymbolHistory> {
  // Observe commit + symbol nodes so edges between them are visible.
  const commitObs = await observe(warp, commitSymbolLens());
  const allEdges: readonly WarpEdge[] = await commitObs.getEdges();

  // Find edges from commit nodes to sym nodes matching the symbol name.
  const matchingEdges: { commitId: string; changeKind: ChangeKind; symId: string }[] = [];

  for (const edge of allEdges) {
    if (!edge.from.startsWith("commit:")) continue;
    if (!CHANGE_LABELS.has(edge.label)) continue;
    if (!edge.to.startsWith("sym:")) continue;

    // Check if this sym node matches the requested symbol name.
    // sym:<filepath>:<symbolPath> — the name is the last segment.
    const symSuffix = edge.to.slice("sym:".length);
    const lastColon = symSuffix.lastIndexOf(":");
    const edgeSymName = lastColon === -1 ? symSuffix : symSuffix.slice(lastColon + 1);

    if (edgeSymName !== symbolName) continue;

    // If filePath filter is provided, check it matches.
    if (filePath !== undefined) {
      const edgeFilePath = filePathFromSymId(edge.to);
      if (edgeFilePath !== filePath) continue;
    }

    matchingEdges.push({
      commitId: edge.from,
      changeKind: labelToChangeKind(edge.label),
      symId: edge.to,
    });
  }

  // Read signature from the sym node using the existing observer.
  const commits: SymbolCommit[] = await Promise.all(
    matchingEdges.map(async ({ commitId, changeKind, symId }) => {
      const sha = commitId.slice("commit:".length);

      const symProps = await commitObs.getNodeProps(symId);
      const signature = typeof symProps?.["signature"] === "string"
        ? symProps["signature"]
        : undefined;

      return { sha, changeKind, signature };
    }),
  );

  return {
    symbol: symbolName,
    filePath,
    commits,
  };
}
