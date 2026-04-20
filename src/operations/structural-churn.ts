// ---------------------------------------------------------------------------
// Structural churn — which symbols change most frequently?
// ---------------------------------------------------------------------------

import type { GitClient } from "../ports/git.js";
import type { PathOps } from "../ports/paths.js";
import { toJsonObject } from "./result-dto.js";
import type { JsonObject } from "../contracts/json-object.js";

// ---- Public types ---------------------------------------------------------

/** Shape of a symbol change returned by the query function. */
export interface ChurnSymbolChange {
  readonly name: string;
  readonly kind: string;
  readonly filePath: string;
}

/** Shape of the result from querying symbols for a commit. */
export interface ChurnCommitSymbols {
  readonly sha: string;
  readonly added: readonly ChurnSymbolChange[];
  readonly removed: readonly ChurnSymbolChange[];
  readonly changed: readonly ChurnSymbolChange[];
}

export interface ChurnEntry {
  readonly symbol: string;
  readonly filePath: string;
  readonly kind: string;
  readonly changeCount: number;
  readonly lastChangedSha: string;
  readonly lastChangedDate: string;
}

export interface StructuralChurnResult {
  readonly entries: readonly ChurnEntry[];
  readonly totalSymbols: number;
  readonly totalCommitsAnalyzed: number;
  readonly summary: string;
}

export interface StructuralChurnOptions {
  readonly cwd: string;
  readonly git: GitClient;
  readonly pathOps: PathOps;
  /** Query function that returns symbol changes for a commit SHA. */
  readonly querySymbolsForCommit: (commitSha: string) => Promise<ChurnCommitSymbols>;
  readonly path?: string | undefined;
  readonly limit?: number | undefined;
}

// ---- Internal helpers -----------------------------------------------------

interface MutableChurnEntry {
  symbol: string;
  filePath: string;
  kind: string;
  changeCount: number;
  lastChangedSha: string;
  lastChangedDate: string;
}

function churnKey(sym: ChurnSymbolChange): string {
  return `${sym.filePath}:${sym.name}`;
}

async function listCommitShas(
  cwd: string,
  git: GitClient,
  pathFilter?: string,
): Promise<readonly { sha: string; date: string }[]> {
  const args = ["log", "--format=%H %aI", "--reverse"];
  if (pathFilter !== undefined) {
    args.push("--", pathFilter);
  }
  const result = await git.run({ args, cwd });
  if (result.error !== undefined || result.status !== 0) {
    const message = result.error !== undefined
      ? result.error.message
      : (result.stderr.trim() || `git exited ${String(result.status)}`);
    throw new Error(`git log failed: ${message}`);
  }
  const output = result.stdout.trim();
  if (output.length === 0) return [];
  return output.split("\n").map((line) => {
    const spaceIdx = line.indexOf(" ");
    return {
      sha: line.slice(0, spaceIdx),
      date: line.slice(spaceIdx + 1),
    };
  });
}

function accumulateSymbols(
  symbols: readonly ChurnSymbolChange[],
  sha: string,
  date: string,
  accumulator: Map<string, MutableChurnEntry>,
  pathFilter: string | undefined,
  pathOps: PathOps,
): void {
  for (const sym of symbols) {
    if (pathFilter !== undefined && !pathOps.isWithin(sym.filePath, pathFilter)) continue;
    const key = churnKey(sym);
    const existing = accumulator.get(key);
    if (existing !== undefined) {
      existing.changeCount++;
      existing.lastChangedSha = sha;
      existing.lastChangedDate = date;
    } else {
      accumulator.set(key, {
        symbol: sym.name,
        filePath: sym.filePath,
        kind: sym.kind,
        changeCount: 1,
        lastChangedSha: sha,
        lastChangedDate: date,
      });
    }
  }
}

// ---- Public API -----------------------------------------------------------

/**
 * Analyze structural churn: which symbols change most frequently?
 *
 * Walks all indexed commits, calls `symbolsForCommit` for each, and
 * accumulates change counts per unique symbol (keyed by filePath:name).
 */
export async function structuralChurn(
  opts: StructuralChurnOptions,
): Promise<StructuralChurnResult> {
  const { cwd, git, pathOps, querySymbolsForCommit, path: pathFilter, limit = 20 } = opts;

  const commits = await listCommitShas(cwd, git, pathFilter);
  const accumulator = new Map<string, MutableChurnEntry>();

  for (const { sha, date } of commits) {
    const commitSymbols = await querySymbolsForCommit(sha);
    accumulateSymbols(commitSymbols.added, sha, date, accumulator, pathFilter, pathOps);
    accumulateSymbols(commitSymbols.removed, sha, date, accumulator, pathFilter, pathOps);
    accumulateSymbols(commitSymbols.changed, sha, date, accumulator, pathFilter, pathOps);
  }

  const sorted = [...accumulator.values()].sort(
    (a, b) => b.changeCount - a.changeCount,
  );
  const entries: readonly ChurnEntry[] = sorted.slice(0, limit);

  const top = entries[0];
  const topName = top?.symbol ?? "none";
  const topCount = top?.changeCount ?? 0;
  const summary = entries.length === 0
    ? "No structural changes found."
    : `${String(accumulator.size)} symbols across ${String(commits.length)} commits. ` +
      `Hottest: ${topName} (${String(topCount)} changes).`;

  return { entries, totalSymbols: accumulator.size, totalCommitsAnalyzed: commits.length, summary };
}

/** Serialize a StructuralChurnResult for MCP / CLI output. */
export function structuralChurnToJson(result: StructuralChurnResult): JsonObject {
  return toJsonObject(result);
}
