// ---------------------------------------------------------------------------
// Traverse + Query Batch Hydration Helper
// ---------------------------------------------------------------------------

import type { Observer, QueryResultV1 } from "@git-stunts/git-warp";

/** A hydrated node with its ID and properties. */
export interface HydratedNode {
  readonly id: string;
  readonly props: Readonly<Record<string, unknown>>;
}

/** Traversal options matching observer.traverse.bfs. */
export interface TraverseOptions {
  readonly dir: "out" | "in";
  readonly labelFilter?: string;
  readonly maxDepth?: number;
}

/**
 * BFS traversal followed by batch property hydration.
 *
 * Combines two common operations into one call:
 * 1. `observer.traverse.bfs()` for topology discovery
 * 2. `observer.query().match(ids).select(["id", "props"]).run()` for batch hydration
 *
 * Returns hydrated nodes with both IDs and properties.
 */
export async function traverseAndHydrate(
  observer: Observer,
  startId: string,
  options: TraverseOptions,
): Promise<readonly HydratedNode[]> {
  let ids: string[];
  try {
    ids = await observer.traverse.bfs(startId, {
      dir: options.dir,
      labelFilter: options.labelFilter,
      maxDepth: options.maxDepth,
    });
  } catch {
    return [];
  }

  if (ids.length === 0) return [];

  const result = await observer.query()
    .match(ids)
    .select(["id", "props"])
    .run() as QueryResultV1;

  return result.nodes
    .filter((n): n is { id: string; props?: Record<string, unknown> } => n.id !== undefined)
    .map((n) => ({
      id: n.id,
      props: n.props ?? {},
    }));
}
