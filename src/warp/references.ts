// ---------------------------------------------------------------------------
// Symbol reference queries — find what depends on a symbol via the WARP graph
// ---------------------------------------------------------------------------

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
  const edges = await obs.getEdges();

  // Determine the target node ID
  const targetId = symbolName === "*"
    ? `file:${filePath}`
    : `sym:${filePath}:${symbolName}`;

  // Find all edges that reference this target
  const incomingRefs = edges.filter(
    (e) => e.label === "references" && e.to === targetId,
  );

  // For each referencing node, read its properties to get importedName/localName
  const results: SymbolReference[] = [];

  for (const edge of incomingRefs) {
    const props = await obs.getNodeProps(edge.from);
    if (props === null) continue;

    const importedName = typeof props["importedName"] === "string" ? props["importedName"] : symbolName;
    const localName = typeof props["localName"] === "string" ? props["localName"] : importedName;
    const nodeFilePath = typeof props["filePath"] === "string" ? props["filePath"] : null;

    if (nodeFilePath !== null) {
      results.push({ filePath: nodeFilePath, importedName, localName });
    }
  }

  return results;
}
