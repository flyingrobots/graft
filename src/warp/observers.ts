/**
 * WARP Observer Factory — canonical observer lenses for graft queries.
 *
 * Observer Law: this module READS through observers. It never
 * walks the graph directly, maintains shadow state, or implements
 * traversal algorithms.
 *
 * Each function returns a lens or an observer with a focused lens.
 * The lens determines the aperture — what the observer can see.
 */

import type { WarpLens, WarpObserverPort } from "../ports/warp.js";
import type { WarpContext } from "./context.js";
import { observeGraph } from "./context.js";
import { SymIdCodec } from "./sym-id-codec.js";

export type { WarpLens };

/**
 * Observe all symbols in a specific file.
 * Aperture: sym:<path>:*
 */
export function fileSymbolsLens(filePath: string): WarpLens {
  return {
    match: SymIdCodec.filePattern(filePath),
    expose: ["name", "kind", "signature", "exported", "startLine", "endLine", "symbolPath", "identityId"],
  };
}

/**
 * Observe all symbols in the project.
 * Aperture: sym:*
 */
export function allSymbolsLens(): WarpLens {
  return {
    match: "sym:*",
    expose: ["name", "kind", "signature", "exported", "startLine", "endLine", "symbolPath", "identityId"],
  };
}

/**
 * Observe all files in the project.
 * Aperture: file:*
 */
export function allFilesLens(): WarpLens {
  return {
    match: "file:*",
    expose: ["path", "lang"],
  };
}

/**
 * Observe a single symbol by name across all files.
 * Aperture: sym:*:<name>
 */
export function symbolByNameLens(symbolName: string): WarpLens {
  return {
    match: SymIdCodec.symbolNamePattern(symbolName),
    expose: ["name", "kind", "signature", "exported", "startLine", "endLine", "symbolPath", "identityId"],
  };
}

/**
 * Observe a directory subtree.
 * Aperture: dir:<path>*
 */
export function directoryLens(dirPath: string): WarpLens {
  return {
    match: `dir:${dirPath}*`,
    expose: ["path"],
  };
}

/**
 * Observe all files under a directory.
 * Aperture: file:<path>/*
 */
export function directoryFilesLens(dirPath: string): WarpLens {
  return {
    match: `file:${dirPath}/*`,
    expose: ["path", "lang"],
  };
}

/**
 * Observe commit metadata.
 * Aperture: commit:*
 */
export function commitsLens(): WarpLens {
  return {
    match: "commit:*",
    expose: ["sha", "message", "timestamp", "author", "email", "tick"],
  };
}

/**
 * Create an observer on the current frontier with a given lens.
 * Observers are static snapshots — create a new one after writes.
 */
export function observe(ctx: WarpContext, lens: WarpLens): Promise<WarpObserverPort> {
  return observeGraph(ctx, lens);
}
