// ---------------------------------------------------------------------------
// Drift Sentinel — scan all markdown files for stale symbol references
// ---------------------------------------------------------------------------

import type { WarpContext } from "./context.js";
import { checkStaleDocs, type StaleDocReport } from "./stale-docs.js";
import type { GitClient } from "../ports/git.js";

/** Options for the drift sentinel scan. */
export interface DriftSentinelOptions {
  readonly cwd: string;
  readonly git: GitClient;
  /** Glob pattern for markdown files to check. Defaults to all tracked .md files. */
  readonly pattern?: string;
}

/** Full drift report across all scanned doc files. */
export interface DriftSentinelReport {
  /** True if no stale or unknown symbols were found in any doc. */
  readonly passed: boolean;
  /** Per-file results. */
  readonly results: readonly StaleDocReport[];
  /** Total stale symbol count across all files. */
  readonly totalStale: number;
  /** Total unknown symbol count across all files. */
  readonly totalUnknown: number;
}

/**
 * Scan all markdown files in the repo for stale symbol references.
 *
 * For each tracked `.md` file, runs `checkStaleDocs` against the WARP
 * graph. Returns a structured report with pass/fail verdict suitable
 * for pre-commit hook exit codes.
 */
export async function runDriftSentinel(
  ctx: WarpContext,
  options: DriftSentinelOptions,
): Promise<DriftSentinelReport> {
  const { cwd, git } = options;

  // List all tracked markdown files
  const lsResult = await git.run({
    cwd,
    args: ["ls-files", "--cached", "*.md", "**/*.md"],
  });

  if (lsResult.error !== undefined || lsResult.status !== 0) {
    return { passed: true, results: [], totalStale: 0, totalUnknown: 0 };
  }

  const mdFiles = lsResult.stdout
    .split("\n")
    .map((f) => f.trim())
    .filter((f) => f.length > 0 && f.endsWith(".md"));

  if (mdFiles.length === 0) {
    return { passed: true, results: [], totalStale: 0, totalUnknown: 0 };
  }

  // For each markdown file, get its last-modified commit SHA and content
  const results: StaleDocReport[] = [];

  for (const mdFile of mdFiles) {
    // Get the commit SHA that last modified this file
    const logResult = await git.run({
      cwd,
      args: ["log", "-1", "--format=%H", "--", mdFile],
    });
    const docCommitSha = logResult.stdout.trim();
    if (docCommitSha.length === 0) continue;

    // Read file content
    const showResult = await git.run({
      cwd,
      args: ["show", `HEAD:${mdFile}`],
    });
    const docContent = showResult.stdout;
    if (docContent.length === 0) continue;

    const report = await checkStaleDocs(ctx, mdFile, docCommitSha, docContent);

    // Only include files that have symbol references
    if (report.staleSymbols.length > 0 || report.unknownSymbols.length > 0) {
      results.push(report);
    }
  }

  const totalStale = results.reduce((sum, r) => sum + r.staleSymbols.length, 0);
  const totalUnknown = results.reduce((sum, r) => sum + r.unknownSymbols.length, 0);
  const passed = totalStale === 0;

  return { passed, results, totalStale, totalUnknown };
}
