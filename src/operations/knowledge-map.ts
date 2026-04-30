// ---------------------------------------------------------------------------
// Knowledge map — "what do I already know?" query over the observation cache
// ---------------------------------------------------------------------------

import type { ObservationCache } from "./observation-cache.js";
import { hashContent } from "./observation-cache.js";
import type { FileSystem } from "../ports/filesystem.js";

export interface KnowledgeFileEntry {
  readonly path: string;
  readonly symbols: readonly string[];
  readonly readCount: number;
  readonly lastReadAt: string;
  readonly stale: boolean;
}

export interface KnowledgeMapResult {
  readonly totalFiles: number;
  readonly totalSymbols: number;
  readonly files: readonly KnowledgeFileEntry[];
  readonly staleFiles: readonly string[];
  readonly directoryCoverage: Readonly<Record<string, number>>;
}

export interface KnowledgeMapOptions {
  readonly cache: ObservationCache;
  readonly fs: FileSystem;
  readonly projectRoot: string;
}

/**
 * Build a knowledge map from the current observation cache.
 *
 * For each observed file, checks whether the file has changed on disk
 * since it was last read (staleness). Aggregates symbols and directory
 * coverage.
 */
export async function buildKnowledgeMap(options: KnowledgeMapOptions): Promise<KnowledgeMapResult> {
  const { cache, fs: fileSystem, projectRoot } = options;
  const files: KnowledgeFileEntry[] = [];
  const staleFiles: string[] = [];
  const dirCounts = new Map<string, number>();
  let totalSymbols = 0;

  for (const [filePath, observation] of cache.allEntries()) {
    const symbols = observation.outline.map((entry) => entry.name);
    totalSymbols += symbols.length;

    // Check staleness by reading current content and comparing hash
    let stale: boolean;
    try {
      const currentContent = await fileSystem.readFile(filePath, "utf-8");
      stale = observation.isStale(hashContent(currentContent));
    } catch {
      // File no longer exists — mark as stale
      stale = true;
    }

    if (stale) {
      staleFiles.push(filePath);
    }

    files.push({
      path: filePath,
      symbols,
      readCount: observation.readCount,
      lastReadAt: observation.lastReadAt,
      stale,
    });

    // Directory coverage — use relative path from project root
    const relative = filePath.startsWith(projectRoot + "/")
      ? filePath.slice(projectRoot.length + 1)
      : filePath;
    const lastSlash = relative.lastIndexOf("/");
    const dir = lastSlash === -1 ? "." : relative.slice(0, lastSlash);
    dirCounts.set(dir, (dirCounts.get(dir) ?? 0) + 1);
  }

  // Sort files by path for deterministic output
  files.sort((a, b) => a.path.localeCompare(b.path));
  staleFiles.sort();

  const directoryCoverage: Record<string, number> = {};
  for (const [dir, count] of [...dirCounts.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    directoryCoverage[dir] = count;
  }

  return {
    totalFiles: files.length,
    totalSymbols,
    files,
    staleFiles,
    directoryCoverage,
  };
}
