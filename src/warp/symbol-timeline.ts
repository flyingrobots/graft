/**
 * WARP Symbol Timeline — ordered history of a symbol across commits.
 *
 * Walks the worldline: for each commit tick, observes all symbols
 * matching the requested name through a ceiling observer, detects
 * additions, changes, and removals by comparing adjacent ticks.
 *
 * This approach is edge-independent — it reads symbol presence and
 * properties directly at each tick, avoiding reliance on `adds`,
 * `changes`, or `removes` edges (which may be invisible when the
 * target node has been deleted).
 */

import type { WarpHandle, WarpObserverLens } from "../ports/warp.js";
import { observe } from "./observers.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single version of a symbol at a specific commit. */
export interface SymbolVersion {
  readonly sha: string;
  readonly tick: number;
  readonly changeKind: "added" | "changed" | "removed";
  readonly present: boolean;
  readonly signature?: string | undefined;
  readonly startLine?: number | undefined;
  readonly endLine?: number | undefined;
  readonly filePath: string;
}

/** Full ordered timeline for a symbol across commits. */
export interface SymbolTimelineResult {
  readonly symbol: string;
  readonly filePath?: string | undefined;
  readonly versions: readonly SymbolVersion[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function filePathFromSymId(symId: string): string {
  const withoutPrefix = symId.slice("sym:".length);
  const lastColon = withoutPrefix.lastIndexOf(":");
  if (lastColon === -1) {
    return withoutPrefix;
  }
  return withoutPrefix.slice(0, lastColon);
}

interface SymSnapshot {
  readonly symId: string;
  readonly filePath: string;
  readonly signature?: string | undefined;
  readonly startLine?: number | undefined;
  readonly endLine?: number | undefined;
}

/**
 * Read all symbol snapshots matching a name at a given tick.
 */
async function readSymbolsAtTick(
  warp: WarpHandle,
  symbolName: string,
  tick: number,
  filterFilePath?: string,
): Promise<SymSnapshot[]> {
  const symLens: WarpObserverLens = {
    match: `sym:*:${symbolName}`,
    expose: ["name", "kind", "signature", "exported", "startLine", "endLine"],
  };
  const obs = await warp.observer(symLens, {
    source: { kind: "live", ceiling: tick },
  });
  const nodeIds = await obs.getNodes();
  const results: SymSnapshot[] = [];

  for (const symId of nodeIds) {
    const fp = filePathFromSymId(symId);
    if (filterFilePath !== undefined && fp !== filterFilePath) continue;

    const props = await obs.getNodeProps(symId);
    results.push({
      symId,
      filePath: fp,
      signature: typeof props?.["signature"] === "string" ? props["signature"] : undefined,
      startLine: typeof props?.["startLine"] === "number" ? props["startLine"] : undefined,
      endLine: typeof props?.["endLine"] === "number" ? props["endLine"] : undefined,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build an ordered timeline of every version of a symbol across commits.
 *
 * For each commit that touched the symbol (adds, changes, removes), the
 * returned array includes the commit SHA, tick, change kind, presence
 * flag, signature, and line range. Entries are sorted by tick ascending.
 */
export async function symbolTimeline(
  warp: WarpHandle,
  symbolName: string,
  filePath?: string,
): Promise<SymbolTimelineResult> {
  // Read all commits sorted by tick.
  const commitLens: WarpObserverLens = {
    match: "commit:*",
    expose: ["sha", "tick"],
  };
  const commitObs = await observe(warp, commitLens);
  const commitNodeIds = await commitObs.getNodes();
  const commits: { sha: string; tick: number }[] = [];

  for (const nodeId of commitNodeIds) {
    const props = await commitObs.getNodeProps(nodeId);
    const sha = typeof props?.["sha"] === "string"
      ? props["sha"]
      : nodeId.slice("commit:".length);
    const tick = typeof props?.["tick"] === "number"
      ? props["tick"]
      : 0;
    commits.push({ sha, tick });
  }
  commits.sort((a, b) => a.tick - b.tick);

  // Walk commits in order, comparing symbol snapshots at adjacent ticks.
  const versions: SymbolVersion[] = [];
  let prevSnapshotBySymId = new Map<string, SymSnapshot>();

  for (const commit of commits) {
    const snapshots = await readSymbolsAtTick(warp, symbolName, commit.tick, filePath);
    const currentBySymId = new Map<string, SymSnapshot>();
    for (const snap of snapshots) {
      currentBySymId.set(snap.symId, snap);
    }

    // Detect additions and changes.
    for (const [symId, current] of currentBySymId) {
      const prev = prevSnapshotBySymId.get(symId);
      if (prev === undefined) {
        // New symbol — added.
        versions.push({
          sha: commit.sha,
          tick: commit.tick,
          changeKind: "added",
          present: true,
          signature: current.signature,
          startLine: current.startLine,
          endLine: current.endLine,
          filePath: current.filePath,
        });
      } else if (
        prev.signature !== current.signature ||
        prev.startLine !== current.startLine ||
        prev.endLine !== current.endLine
      ) {
        // Existing symbol changed.
        versions.push({
          sha: commit.sha,
          tick: commit.tick,
          changeKind: "changed",
          present: true,
          signature: current.signature,
          startLine: current.startLine,
          endLine: current.endLine,
          filePath: current.filePath,
        });
      }
    }

    // Detect removals: symbols present in prev but absent in current.
    for (const [symId, prev] of prevSnapshotBySymId) {
      if (!currentBySymId.has(symId)) {
        versions.push({
          sha: commit.sha,
          tick: commit.tick,
          changeKind: "removed",
          present: false,
          signature: undefined,
          startLine: undefined,
          endLine: undefined,
          filePath: prev.filePath,
        });
      }
    }

    prevSnapshotBySymId = currentBySymId;
  }

  return {
    symbol: symbolName,
    filePath,
    versions,
  };
}
