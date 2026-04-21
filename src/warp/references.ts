// ---------------------------------------------------------------------------
// Symbol reference queries — find what depends on a symbol via the WARP graph
// ---------------------------------------------------------------------------

import type { QueryResultV1 } from "@git-stunts/git-warp";
import type { WarpContext } from "./context.js";
import { observeGraph } from "./context.js";

export interface SymbolReference {
  readonly filePath: string;
  readonly importedName: string;
  readonly localName: string;
}

/**
 * Find all files that reference a symbol, by querying the WARP graph's
 * cross-file import resolution edges.
 *
 * Uses traverse.bfs for edge discovery (substrate-side) and QueryBuilder
 * for batch prop reads. No getEdges() — never assumes all edges fit in
 * memory.
 *
 * For named symbols: finds import_specifier/export_specifier nodes that
 * have a `references` edge pointing at `sym:<filePath>:<symbolName>`.
 *
 * For namespace imports ("*"): finds namespace_import nodes that have a
 * `references` edge pointing at `file:<filePath>`.
 */
export async function referencesForSymbol(
  ctx: WarpContext,
  symbolName: string,
  filePath: string,
): Promise<SymbolReference[]> {
  const obs = await observeGraph(ctx, { match: ["ast:*", "file:*", "sym:*"] });

  // Determine the target node ID
  const targetId = symbolName === "*"
    ? `file:${filePath}`
    : `sym:${filePath}:${symbolName}`;

  // Guard: target must exist for traverse to work.
  const targetExists = await obs.hasNode(targetId);
  if (!targetExists) return [];

  // Traverse: find AST nodes with incoming `references` edges to the target.
  const referrerIds = await obs.traverse.bfs(targetId, {
    dir: "in",
    labelFilter: "references",
    maxDepth: 1,
  });

  const astReferrerIds = referrerIds.filter((id) => id.startsWith("ast:"));
  if (astReferrerIds.length === 0) return [];

  // Batch prop read for all referencing nodes.
  const propsResult = await obs.query()
    .match(astReferrerIds)
    .select(["id", "props"])
    .run() as QueryResultV1;

  const results: SymbolReference[] = [];

  for (const node of propsResult.nodes) {
    if (node.id === undefined) continue;
    const props = node.props ?? {};

    const importedName = typeof props["importedName"] === "string" ? props["importedName"] : symbolName;
    const localName = typeof props["localName"] === "string" ? props["localName"] : importedName;
    const nodeFilePath = typeof props["filePath"] === "string" ? props["filePath"] : null;

    if (nodeFilePath !== null) {
      results.push({ filePath: nodeFilePath, importedName, localName });
    }
  }

  return results;
}
