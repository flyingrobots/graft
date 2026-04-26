// ---------------------------------------------------------------------------
// WARP-based symbol reference counting
// ---------------------------------------------------------------------------

import type { WarpContext } from "./context.js";
import { referencesForSymbol } from "./references.js";

export interface ReferenceCountResult {
  readonly symbol: string;
  readonly referenceCount: number;
  readonly referencingFiles: readonly string[];
}

/**
 * Count how many files reference a symbol via WARP graph edges.
 *
 * Uses `referencesForSymbol` which traverses incoming `references`
 * edges from import/export specifier AST nodes to the target sym node.
 * Uses actual imports, not text matches, and does not spawn subprocesses.
 *
 * @param ctx - WARP context
 * @param symbolName - The symbol to count references for
 * @param filePath - The file where the symbol is defined (required for sym node ID)
 */
export async function countSymbolReferencesFromGraph(
  ctx: WarpContext,
  symbolName: string,
  filePath?: string,
): Promise<ReferenceCountResult> {
  if (filePath === undefined) {
    // Without filePath we can't construct the sym node ID.
    // Return empty — caller should provide filePath for accurate results.
    return { symbol: symbolName, referenceCount: 0, referencingFiles: [] };
  }

  const refs = await referencesForSymbol(ctx, symbolName, filePath);

  // Deduplicate by file path (multiple imports from the same file
  // count as one referencing file).
  const uniqueFiles = [...new Set(refs.map((r) => r.filePath))];

  return {
    symbol: symbolName,
    referenceCount: uniqueFiles.length,
    referencingFiles: uniqueFiles,
  };
}
