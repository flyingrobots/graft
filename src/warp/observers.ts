/**
 * WARP Observer Factory — canonical observer lenses for graft queries.
 *
 * Observer Law: this module READS through observers. It never
 * walks the graph directly, maintains shadow state, or implements
 * traversal algorithms.
 *
 * Each function returns an observer with a focused lens. The lens
 * determines the aperture — what the observer can see.
 */

import type WarpApp from "@git-stunts/git-warp";

// Lens config shape matching git-warp's observer API
interface Lens {
  match: string;
  expose?: string[];
  redact?: string[];
}

/**
 * Observe all symbols in a specific file.
 * Aperture: sym:<path>:*
 */
export function fileSymbolsLens(filePath: string): Lens {
  return {
    match: `sym:${filePath}:*`,
    expose: ["name", "kind", "signature", "exported", "startLine", "endLine"],
  };
}

/**
 * Observe all symbols in the project.
 * Aperture: sym:*
 */
export function allSymbolsLens(): Lens {
  return {
    match: "sym:*",
    expose: ["name", "kind", "signature", "exported"],
  };
}

/**
 * Observe all files in the project.
 * Aperture: file:*
 */
export function allFilesLens(): Lens {
  return {
    match: "file:*",
    expose: ["path", "lang"],
  };
}

/**
 * Observe a single symbol by name across all files.
 * Aperture: sym:*:<name>
 */
export function symbolByNameLens(symbolName: string): Lens {
  return {
    match: `sym:*:${symbolName}`,
    expose: ["name", "kind", "signature", "exported", "startLine", "endLine"],
  };
}

/**
 * Observe commit metadata.
 * Aperture: commit:*
 */
export function commitsLens(): Lens {
  return {
    match: "commit:*",
    expose: ["sha", "message", "timestamp"],
  };
}

/**
 * Create an observer on a worldline with a given lens.
 */
export async function observe(warp: WarpApp, lens: Lens): Promise<unknown> {
  const worldline = warp.worldline();
  return worldline.observer(lens);
}
