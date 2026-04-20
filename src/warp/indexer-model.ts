import { diffOutlines } from "../parser/diff.js";
import type { JumpEntry, OutlineEntry } from "../parser/types.js";
import type { GitClient } from "../ports/git.js";

export interface IndexOptions {
  readonly cwd: string;
  readonly git: GitClient;
  readonly from?: string;
  readonly to?: string;
}

export interface IndexResultOk {
  readonly ok: true;
  readonly commitsIndexed: number;
  readonly patchesWritten: number;
  readonly commitTicks: ReadonlyMap<string, number>;
}

export interface IndexResultError {
  readonly ok: false;
  readonly error: string;
}

export type IndexResult = IndexResultOk | IndexResultError;

/**
 * Alias kept for internal indexer use. Structurally identical to
 * the port's WarpPatchBuilder — no adapter-layer cast needed.
 */
export type { WarpPatchBuilder as PatchOps } from "../ports/warp.js";

export interface PreparedChange {
  readonly status: string;
  readonly filePath: string;
  readonly previousPath?: string | undefined;
  readonly fileId: string;
  readonly lang: string | null;
  readonly parentExists: boolean;
  readonly oldOutline: readonly OutlineEntry[];
  readonly newOutline?: readonly OutlineEntry[] | undefined;
  readonly jumpLookup?: Map<string, { start: number; end: number }> | undefined;
  readonly diff?: ReturnType<typeof diffOutlines> | undefined;
  readonly parsedTree?: { root: import("web-tree-sitter").SyntaxNode; delete(): void } | undefined;
}

export function fileNodeId(filePath: string): string {
  return `file:${filePath}`;
}

export function dirNodeId(dirPath: string): string {
  return `dir:${dirPath}`;
}

export function symNodeId(filePath: string, name: string): string {
  return `sym:${filePath}:${name}`;
}

export function identityNodeId(identityId: string): string {
  return identityId;
}

export function buildJumpLookup(jumpTable: readonly JumpEntry[]): Map<string, { start: number; end: number }> {
  const lookup = new Map<string, { start: number; end: number }>();
  for (const entry of jumpTable) {
    lookup.set(entry.symbol, { start: entry.start, end: entry.end });
  }
  return lookup;
}
