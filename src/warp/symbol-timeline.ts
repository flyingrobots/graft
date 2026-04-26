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

import type { Lens, PatchV2 } from "@git-stunts/git-warp";
import { observeGraph, type WarpContext } from "./context.js";

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

type ChangeKind = SymbolVersion["changeKind"];

interface PatchOpView {
  readonly type?: unknown;
  readonly from?: unknown;
  readonly to?: unknown;
  readonly label?: unknown;
  readonly node?: unknown;
  readonly key?: unknown;
  readonly value?: unknown;
}

interface ProvenanceCore {
  patchesFor(entityId: string): Promise<string[]>;
  loadPatchBySha(sha: string): Promise<PatchV2>;
}

const EDGE_CHANGE_KIND = new Map<string, ChangeKind>([
  ["adds", "added"],
  ["changes", "changed"],
  ["removes", "removed"],
]);

function hasProvenanceCore(core: unknown): core is ProvenanceCore {
  return typeof (core as { patchesFor?: unknown }).patchesFor === "function" &&
    typeof (core as { loadPatchBySha?: unknown }).loadPatchBySha === "function";
}

function symIdFor(filePath: string, symbolName: string): string {
  return `sym:${filePath}:${symbolName}`;
}

function patchOps(patch: PatchV2): readonly PatchOpView[] {
  return Array.isArray(patch.ops) ? patch.ops as readonly PatchOpView[] : [];
}

function readSymbolProperty(
  ops: readonly PatchOpView[],
  symId: string,
  key: string,
): unknown {
  for (let index = ops.length - 1; index >= 0; index--) {
    const op = ops[index];
    if (op?.type !== "PropSet") continue;
    if (op.node !== symId) continue;
    if (op.key !== key) continue;
    return op.value;
  }
  return undefined;
}

function versionFromPatch(symId: string, patch: PatchV2): SymbolVersion | null {
  const ops = patchOps(patch);

  for (const op of ops) {
    if (op.type !== "EdgeAdd") continue;
    if (typeof op.from !== "string" || !op.from.startsWith("commit:")) continue;
    if (op.to !== symId || typeof op.label !== "string") continue;

    const changeKind = EDGE_CHANGE_KIND.get(op.label);
    if (changeKind === undefined) continue;

    const signature = readSymbolProperty(ops, symId, "signature");
    const startLine = readSymbolProperty(ops, symId, "startLine");
    const endLine = readSymbolProperty(ops, symId, "endLine");

    return {
      sha: op.from.slice("commit:".length),
      tick: patch.lamport,
      changeKind,
      present: changeKind !== "removed",
      signature: typeof signature === "string" ? signature : undefined,
      startLine: typeof startLine === "number" ? startLine : undefined,
      endLine: typeof endLine === "number" ? endLine : undefined,
      filePath: filePathFromSymId(symId),
    };
  }

  return null;
}

async function liveSymbolIds(
  ctx: WarpContext,
  symbolName: string,
  filePath: string | undefined,
): Promise<readonly string[]> {
  if (filePath !== undefined) {
    return [symIdFor(filePath, symbolName)];
  }

  const obs = await observeGraph(ctx, { match: `sym:*:${symbolName}`, expose: [] });
  return obs.getNodes();
}

async function readTimelineFromProvenance(
  ctx: WarpContext,
  symbolName: string,
  filePath: string | undefined,
): Promise<SymbolVersion[] | null> {
  if (typeof (ctx.app as { core?: unknown }).core !== "function") return null;

  const core = ctx.app.core();
  if (!hasProvenanceCore(core)) return null;

  const symIds = await liveSymbolIds(ctx, symbolName, filePath);
  if (symIds.length === 0) return null;

  const versions: SymbolVersion[] = [];
  const seen = new Set<string>();

  for (const symId of symIds) {
    const patchShas = await core.patchesFor(symId);
    const patches = await Promise.all(patchShas.map(async (sha) => core.loadPatchBySha(sha)));

    for (const patch of patches) {
      const version = versionFromPatch(symId, patch);
      if (version === null) continue;

      const key = `${String(version.tick)}:${version.sha}:${symId}:${version.changeKind}`;
      if (seen.has(key)) continue;

      versions.push(version);
      seen.add(key);
    }
  }

  versions.sort((a, b) => a.tick - b.tick || a.filePath.localeCompare(b.filePath));
  return versions;
}

/**
 * Read all symbol snapshots matching a name at a given tick.
 */
async function readSymbolsAtTick(
  ctx: WarpContext,
  symbolName: string,
  tick: number,
  filterFilePath?: string,
): Promise<SymSnapshot[]> {
  const symLens: Lens = {
    match: `sym:*:${symbolName}`,
    expose: ["name", "kind", "signature", "exported", "startLine", "endLine"],
  };
  const obs = await observeGraph(ctx, symLens, {
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
  ctx: WarpContext,
  symbolName: string,
  filePath?: string,
): Promise<SymbolTimelineResult> {
  const provenanceVersions = await readTimelineFromProvenance(ctx, symbolName, filePath);
  if (provenanceVersions !== null) {
    return {
      symbol: symbolName,
      filePath,
      versions: provenanceVersions,
    };
  }

  // Read all commits sorted by tick.
  const commitLens: Lens = {
    match: "commit:*",
    expose: ["sha", "tick"],
  };
  const commitObs = await observeGraph(ctx, commitLens);
  const commitNodeIds = await commitObs.getNodes();
  const commits: { sha: string; tick: number }[] = [];

  for (const nodeId of commitNodeIds) {
    const props = await commitObs.getNodeProps(nodeId);
    const sha = typeof props?.["sha"] === "string"
      ? props["sha"]
      : nodeId.slice("commit:".length);
    if (typeof props?.["tick"] !== "number") {
      continue;
    }
    commits.push({ sha, tick: props["tick"] });
  }
  commits.sort((a, b) => a.tick - b.tick);

  // Walk commits in order, comparing symbol snapshots at adjacent ticks.
  const versions: SymbolVersion[] = [];
  let prevSnapshotBySymId = new Map<string, SymSnapshot>();

  for (const commit of commits) {
    const snapshots = await readSymbolsAtTick(ctx, symbolName, commit.tick, filePath);
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
