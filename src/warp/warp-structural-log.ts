// ---------------------------------------------------------------------------
// WARP-based Structural Log — replaces git log SHA walking
// ---------------------------------------------------------------------------

import type { QueryResultV1 } from "@git-stunts/git-warp";
import type { WarpContext } from "./context.js";
import { observeGraph } from "./context.js";
import type {
  StructuralLogEntry,
  StructuralLogCommitSymbols,
  StructuralLogSymbolChange,
} from "../operations/structural-log.js";

/** Options for WARP-based structural log. */
export interface WarpLogOptions {
  readonly limit?: number;
  readonly path?: string;
}

/**
 * Produce a structural log entirely from the WARP graph.
 *
 * Walks commit nodes in reverse tick order (most recent first),
 * traverses outgoing adds/changes/removes edges per commit to
 * collect symbol changes. Zero git subprocess calls.
 */
export async function structuralLogFromGraph(
  ctx: WarpContext,
  options?: WarpLogOptions,
): Promise<readonly StructuralLogEntry[]> {
  const limit = options?.limit ?? 20;
  const pathFilter = options?.path;

  // Query all commit nodes
  const obs = await observeGraph(ctx, {
    match: ["commit:*", "sym:*"],
    expose: ["sha", "tick", "message", "author", "date", "name", "kind", "signature", "exported"],
  });

  const commitResult = await obs.query()
    .match("commit:*")
    .select(["id", "props"])
    .run() as QueryResultV1;

  const commits: { id: string; sha: string; tick: number; message: string; author: string; date: string }[] = [];
  for (const node of commitResult.nodes) {
    if (node.id === undefined) continue;
    const props = node.props ?? {};
    commits.push({
      id: node.id,
      sha: typeof props["sha"] === "string" ? props["sha"] : node.id.slice("commit:".length),
      tick: typeof props["tick"] === "number" ? props["tick"] : 0,
      message: typeof props["message"] === "string" ? props["message"] : "",
      author: typeof props["author"] === "string" ? props["author"] : "",
      date: typeof props["date"] === "string" ? props["date"] : "",
    });
  }

  if (commits.length === 0) return [];

  // Sort by tick descending (most recent first)
  commits.sort((a, b) => b.tick - a.tick);
  const scoped = commits.slice(0, limit);

  // For each commit, traverse edges to get symbol changes
  const edgeLabels = [
    { label: "adds", key: "added" },
    { label: "changes", key: "changed" },
    { label: "removes", key: "removed" },
  ] as const;

  const entries: StructuralLogEntry[] = [];

  for (const commit of scoped) {
    const added: StructuralLogSymbolChange[] = [];
    const changed: StructuralLogSymbolChange[] = [];
    const removed: StructuralLogSymbolChange[] = [];

    for (const { label, key } of edgeLabels) {
      const symIds = await obs.traverse.bfs(commit.id, {
        dir: "out",
        labelFilter: label,
        maxDepth: 1,
      });

      for (const symId of symIds) {
        if (!symId.startsWith("sym:")) continue;

        const withoutPrefix = symId.slice("sym:".length);
        const lastColon = withoutPrefix.lastIndexOf(":");
        if (lastColon === -1) continue;

        const filePath = withoutPrefix.slice(0, lastColon);
        const symbolName = withoutPrefix.slice(lastColon + 1);

        if (pathFilter !== undefined && !filePath.startsWith(pathFilter)) continue;

        const symProps = await obs.getNodeProps(symId);
        const kind = typeof symProps?.["kind"] === "string" ? symProps["kind"] : "unknown";
        const signature = typeof symProps?.["signature"] === "string" ? symProps["signature"] : undefined;
        const exported = typeof symProps?.["exported"] === "boolean" ? symProps["exported"] : false;

        const change: StructuralLogSymbolChange = {
          name: symbolName,
          kind,
          signature,
          exported,
          filePath,
        };

        if (key === "added") added.push(change);
        else if (key === "changed") changed.push(change);
        else removed.push(change);
      }
    }

    const symbols: StructuralLogCommitSymbols = { added, removed, changed };
    const totalChanges = added.length + changed.length + removed.length;

    entries.push({
      sha: commit.sha,
      author: commit.author,
      date: commit.date,
      message: commit.message,
      symbols,
      summary: totalChanges === 0
        ? "No structural changes."
        : `${String(added.length)} added, ${String(changed.length)} changed, ${String(removed.length)} removed.`,
    });
  }

  return entries;
}
