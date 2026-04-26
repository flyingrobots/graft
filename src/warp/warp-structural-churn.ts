// ---------------------------------------------------------------------------
// WARP-based Structural Churn — replaces git log + per-commit iteration
// ---------------------------------------------------------------------------

import type { QueryResultV1 } from "@git-stunts/git-warp";
import type { WarpContext } from "./context.js";
import { observeGraph } from "./context.js";
import type { ChurnEntry, StructuralChurnResult } from "../operations/structural-churn.js";

/** Options for WARP-based churn analysis. */
export interface WarpChurnOptions {
  readonly limit?: number;
  readonly path?: string;
}

interface MutableChurnEntry {
  symbol: string;
  filePath: string;
  kind: string;
  changeCount: number;
  lastChangedSha: string;
  lastChangedDate: string;
}

/**
 * Compute structural churn entirely from the WARP graph.
 *
 * Walks all commit nodes, then for each commit traverses outgoing
 * `adds`, `changes`, and `removes` edges to sym nodes. Accumulates
 * per-symbol change counts. Zero git subprocess calls.
 */
export async function structuralChurnFromGraph(
  ctx: WarpContext,
  options?: WarpChurnOptions,
): Promise<StructuralChurnResult> {
  const limit = options?.limit ?? 20;
  const pathFilter = options?.path;

  // Find all commit nodes via query
  const commitObs = await observeGraph(ctx, {
    match: "commit:*",
    expose: ["sha", "tick"],
  });

  const commitResult = await commitObs.query()
    .match("commit:*")
    .select(["id", "props"])
    .run() as QueryResultV1;

  const commits: { id: string; sha: string; tick: number }[] = [];
  for (const node of commitResult.nodes) {
    if (node.id === undefined) continue;
    const props = node.props ?? {};
    const sha = typeof props["sha"] === "string" ? props["sha"] : node.id.slice("commit:".length);
    const tick = typeof props["tick"] === "number" ? props["tick"] : 0;
    commits.push({ id: node.id, sha, tick });
  }

  if (commits.length === 0) {
    return { entries: [], totalSymbols: 0, totalCommitsAnalyzed: 0, summary: "No indexed commits." };
  }

  commits.sort((a, b) => a.tick - b.tick);

  // For each commit, traverse outgoing adds/changes/removes edges to sym nodes
  const accumulator = new Map<string, MutableChurnEntry>();
  const edgeLabels = ["adds", "changes", "removes"] as const;

  const symObs = await observeGraph(ctx, {
    match: ["commit:*", "sym:*"],
    expose: ["name", "kind", "sha", "tick"],
  });

  for (const commit of commits) {
    for (const label of edgeLabels) {
      const symIds = await symObs.traverse.bfs(commit.id, {
        dir: "out",
        labelFilter: label,
        maxDepth: 1,
      });

      for (const symId of symIds) {
        if (!symId.startsWith("sym:")) continue;

        // Extract file path from sym ID: sym:<filePath>:<symbolName>
        const withoutPrefix = symId.slice("sym:".length);
        const lastColon = withoutPrefix.lastIndexOf(":");
        if (lastColon === -1) continue;

        const filePath = withoutPrefix.slice(0, lastColon);
        const symbolName = withoutPrefix.slice(lastColon + 1);

        // Apply path filter
        if (pathFilter !== undefined && !filePath.startsWith(pathFilter)) continue;

        const key = symId;
        const existing = accumulator.get(key);
        if (existing !== undefined) {
          existing.changeCount++;
          existing.lastChangedSha = commit.sha;
        } else {
          // Read sym node props for kind
          const symProps = await symObs.getNodeProps(symId);
          const kind = typeof symProps?.["kind"] === "string" ? symProps["kind"] : "unknown";

          accumulator.set(key, {
            symbol: symbolName,
            filePath,
            kind,
            changeCount: 1,
            lastChangedSha: commit.sha,
            lastChangedDate: "",
          });
        }
      }
    }
  }

  const sorted = [...accumulator.values()].sort((a, b) => b.changeCount - a.changeCount);
  const entries: ChurnEntry[] = sorted.slice(0, limit).map((e) => ({
    symbol: e.symbol,
    filePath: e.filePath,
    kind: e.kind,
    changeCount: e.changeCount,
    lastChangedSha: e.lastChangedSha,
    lastChangedDate: e.lastChangedDate,
  }));

  const top = entries[0];
  const topName = top?.symbol ?? "none";
  const topCount = top?.changeCount ?? 0;
  const summary = entries.length === 0
    ? "No structural changes found."
    : `${String(accumulator.size)} symbols across ${String(commits.length)} commits. Hottest: ${topName} (${String(topCount)} changes).`;

  return {
    entries,
    totalSymbols: accumulator.size,
    totalCommitsAnalyzed: commits.length,
    summary,
  };
}
