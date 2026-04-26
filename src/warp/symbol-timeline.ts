/**
 * WARP Symbol Timeline — ordered history of a symbol across commits.
 *
 * Reads WARP provenance for symbol ids and reconstructs versions from
 * patches that touched the symbol. Callers that need removed-symbol
 * history must pass filePath so the symbol id is explicit.
 */

import type { PatchV2 } from "@git-stunts/git-warp";
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

type ChangeKind = SymbolVersion["changeKind"];

interface PatchOpView {
  readonly type?: unknown;
  readonly from?: unknown;
  readonly to?: unknown;
  readonly label?: unknown;
}

interface ProvenanceTimelineCore {
  patchesFor(entityId: string): Promise<string[]>;
  loadPatchBySha(sha: string): Promise<PatchV2>;
}

const EDGE_CHANGE_KIND = new Map<string, ChangeKind>([
  ["adds", "added"],
  ["changes", "changed"],
  ["removes", "removed"],
]);

function symIdFor(filePath: string, symbolName: string): string {
  return `sym:${filePath}:${symbolName}`;
}

function patchOps(patch: PatchV2): readonly PatchOpView[] {
  return Array.isArray(patch.ops) ? patch.ops as readonly PatchOpView[] : [];
}

interface SymbolTouch {
  readonly sha: string;
  readonly tick: number;
  readonly changeKind: ChangeKind;
}

function touchFromPatch(symId: string, patch: PatchV2): SymbolTouch | null {
  const ops = patchOps(patch);

  for (const op of ops) {
    if (op.type !== "EdgeAdd") continue;
    if (typeof op.from !== "string" || !op.from.startsWith("commit:")) continue;
    if (op.to !== symId || typeof op.label !== "string") continue;

    const changeKind = EDGE_CHANGE_KIND.get(op.label);
    if (changeKind === undefined) continue;

    return {
      sha: op.from.slice("commit:".length),
      tick: patch.lamport,
      changeKind,
    };
  }

  return null;
}

async function readSymbolPropsAtTick(
  ctx: WarpContext,
  symId: string,
  tick: number,
): Promise<Record<string, unknown> | null> {
  const worldline = await ctx.app.worldline().seek({
    source: { kind: "live", ceiling: tick },
  });
  return worldline.getNodeProps(symId);
}

async function versionFromPatch(
  ctx: WarpContext,
  symId: string,
  patch: PatchV2,
): Promise<SymbolVersion | null> {
  const touch = touchFromPatch(symId, patch);
  if (touch === null) {
    return null;
  }

  const props = touch.changeKind === "removed"
    ? null
    : await readSymbolPropsAtTick(ctx, symId, touch.tick);
  const signature = props?.["signature"];
  const startLine = props?.["startLine"];
  const endLine = props?.["endLine"];

  return {
    sha: touch.sha,
    tick: touch.tick,
    changeKind: touch.changeKind,
    present: touch.changeKind !== "removed",
    signature: typeof signature === "string" ? signature : undefined,
    startLine: typeof startLine === "number" ? startLine : undefined,
    endLine: typeof endLine === "number" ? endLine : undefined,
    filePath: filePathFromSymId(symId),
  };
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

async function readTimelineVersions(
  ctx: WarpContext,
  symbolName: string,
  filePath: string | undefined,
): Promise<SymbolVersion[]> {
  const core = ctx.app.core() as unknown as ProvenanceTimelineCore;
  const symIds = await liveSymbolIds(ctx, symbolName, filePath);
  if (symIds.length === 0) return [];

  const versions: SymbolVersion[] = [];
  const seen = new Set<string>();

  for (const symId of symIds) {
    const patchShas = await core.patchesFor(symId);
    const patches = await Promise.all(patchShas.map(async (sha) => core.loadPatchBySha(sha)));

    for (const patch of patches) {
      const version = await versionFromPatch(ctx, symId, patch);
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
  return {
    symbol: symbolName,
    filePath,
    versions: await readTimelineVersions(ctx, symbolName, filePath),
  };
}
