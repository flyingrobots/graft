// ---------------------------------------------------------------------------
// WARP-based Structural Blame — replaces git-dependent blame pipeline
// ---------------------------------------------------------------------------

import type { WarpContext } from "./context.js";
import { symbolTimeline, type SymbolVersion } from "./symbol-timeline.js";
import { countSymbolReferencesFromGraph } from "./warp-reference-count.js";

/** Blame result for a single symbol. */
export interface WarpBlameResult {
  readonly symbol: string;
  readonly filePath: string;
  readonly history: readonly SymbolVersion[];
  readonly changeCount: number;
  readonly createdInCommit: string | undefined;
  readonly lastSignatureChange: string | undefined;
  readonly referenceCount: number;
}

/**
 * Compute structural blame for a symbol entirely from the WARP graph.
 *
 * Uses symbolTimeline for history, countSymbolReferencesFromGraph for
 * reference counting. Zero git subprocess calls.
 */
export async function structuralBlameFromGraph(
  ctx: WarpContext,
  symbolName: string,
  filePath: string,
): Promise<WarpBlameResult> {
  // Get full timeline from WARP
  const timeline = await symbolTimeline(ctx, symbolName, filePath);

  if (timeline.versions.length === 0) {
    return {
      symbol: symbolName,
      filePath,
      history: [],
      changeCount: 0,
      createdInCommit: undefined,
      lastSignatureChange: undefined,
      referenceCount: 0,
    };
  }

  // Find creation commit (first "added" entry)
  const created = timeline.versions.find((v) => v.changeKind === "added");

  // Find last signature change (last "changed" entry)
  const changes = timeline.versions.filter((v) => v.changeKind === "changed");
  const lastChange = changes.length > 0 ? changes[changes.length - 1] : undefined;

  // Count references from WARP graph
  const refs = await countSymbolReferencesFromGraph(ctx, symbolName, filePath);

  return {
    symbol: symbolName,
    filePath,
    history: timeline.versions,
    changeCount: timeline.versions.length,
    createdInCommit: created?.sha,
    lastSignatureChange: lastChange?.sha,
    referenceCount: refs.referenceCount,
  };
}
