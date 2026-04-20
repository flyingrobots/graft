// ---------------------------------------------------------------------------
// Structural Log — per-commit symbol change history
// ---------------------------------------------------------------------------

import type { GitClient } from "../ports/git.js";
import type { PathOps } from "../ports/paths.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A symbol that was added, removed, or changed in a commit. */
export interface StructuralLogSymbolChange {
  readonly name: string;
  readonly kind: string;
  readonly signature?: string | undefined;
  readonly exported: boolean;
  readonly filePath: string;
}

/** Symbol changes for a single commit, as returned by the query function. */
export interface StructuralLogCommitSymbols {
  readonly sha: string;
  readonly added: readonly StructuralLogSymbolChange[];
  readonly removed: readonly StructuralLogSymbolChange[];
  readonly changed: readonly StructuralLogSymbolChange[];
}

export interface StructuralLogEntry {
  readonly sha: string;
  readonly message: string;
  readonly author: string;
  readonly date: string;
  readonly symbols: {
    readonly added: readonly StructuralLogSymbolChange[];
    readonly removed: readonly StructuralLogSymbolChange[];
    readonly changed: readonly StructuralLogSymbolChange[];
  };
  readonly summary: string;
}

export interface StructuralLogOptions {
  /** Query function that returns symbol changes for a commit SHA. */
  readonly querySymbols: (sha: string) => Promise<StructuralLogCommitSymbols>;
  readonly git: GitClient;
  readonly pathOps: PathOps;
  readonly cwd: string;
  readonly since?: string | undefined;
  readonly until?: string | undefined;
  readonly path?: string | undefined;
  readonly limit?: number | undefined;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface CommitMeta {
  readonly sha: string;
  readonly message: string;
  readonly author: string;
  readonly date: string;
}

function buildSummary(symbols: StructuralLogCommitSymbols): string {
  const parts: string[] = [];
  if (symbols.added.length > 0) {
    parts.push(`+${String(symbols.added.length)} added`);
  }
  if (symbols.changed.length > 0) {
    parts.push(`~${String(symbols.changed.length)} changed`);
  }
  if (symbols.removed.length > 0) {
    parts.push(`-${String(symbols.removed.length)} removed`);
  }
  return parts.length > 0 ? parts.join(", ") : "no symbol changes";
}

function filterByPath(
  symbols: StructuralLogCommitSymbols,
  filterPath: string,
  pathOps: PathOps,
): StructuralLogCommitSymbols {
  const matches = (s: StructuralLogSymbolChange): boolean =>
    pathOps.isWithin(s.filePath, filterPath);
  return {
    sha: symbols.sha,
    added: symbols.added.filter(matches),
    removed: symbols.removed.filter(matches),
    changed: symbols.changed.filter(matches),
  };
}

function assertGitSuccess(result: { status: number | null; stderr: string }, label: string): void {
  if (result.status !== 0) {
    throw new Error(`${label}: ${result.stderr}`);
  }
}

// ---------------------------------------------------------------------------
// Core operation
// ---------------------------------------------------------------------------

/**
 * Structural git log — shows symbol-level changes per commit.
 *
 * Uses `git log` to enumerate commits in range, then queries for
 * symbol-level diffs at each commit via the injected query function.
 */
export async function structuralLog(
  opts: StructuralLogOptions,
): Promise<readonly StructuralLogEntry[]> {
  const limit = opts.limit ?? 20;
  const until = opts.until ?? "HEAD";

  // Build git log args for commit SHAs in range
  const logArgs = ["log", "--format=%H", `--max-count=${String(limit)}`];
  if (opts.since !== undefined) {
    logArgs.push(`${opts.since}..${until}`);
  } else {
    logArgs.push(until);
  }
  if (opts.path !== undefined) {
    logArgs.push("--", opts.path);
  }

  const shaResult = await opts.git.run({
    args: logArgs,
    cwd: opts.cwd,
  });
  assertGitSuccess(shaResult, "git log failed");

  const shas = shaResult.stdout
    .trim()
    .split("\n")
    .filter((line) => line.length > 0);

  if (shas.length === 0) {
    return [];
  }

  // Get commit metadata in bulk: sha, author, date, message
  const metaResult = await opts.git.run({
    args: [
      "log",
      "--format=%H%x00%an%x00%aI%x00%s",
      `--max-count=${String(limit)}`,
      ...(opts.since !== undefined
        ? [`${opts.since}..${until}`]
        : [until]),
      ...(opts.path !== undefined ? ["--", opts.path] : []),
    ],
    cwd: opts.cwd,
  });
  assertGitSuccess(metaResult, "git log metadata failed");

  const metaMap = new Map<string, CommitMeta>();
  for (const line of metaResult.stdout.trim().split("\n")) {
    if (line.length === 0) continue;
    const [sha, author, date, ...messageParts] = line.split("\x00");
    if (sha !== undefined && author !== undefined && date !== undefined) {
      metaMap.set(sha, {
        sha,
        author,
        date,
        message: messageParts.join("\x00"),
      });
    }
  }

  // Query for symbol changes at each commit
  const entries: StructuralLogEntry[] = [];

  for (const sha of shas) {
    const meta = metaMap.get(sha);
    if (meta === undefined) continue;

    let symbols = await opts.querySymbols(sha);

    // Apply path filter if specified
    if (opts.path !== undefined) {
      symbols = filterByPath(symbols, opts.path, opts.pathOps);
    }

    entries.push({
      sha: meta.sha,
      message: meta.message,
      author: meta.author,
      date: meta.date,
      symbols: {
        added: [...symbols.added],
        removed: [...symbols.removed],
        changed: [...symbols.changed],
      },
      summary: buildSummary(symbols),
    });
  }

  return entries;
}
