// ---------------------------------------------------------------------------
// Symbol reference counting — structural query for cross-file symbol usage
// ---------------------------------------------------------------------------

import type { ProcessRunner } from "../ports/process-runner.js";
import type { GitClient } from "../ports/git.js";

// ---- Public types ---------------------------------------------------------

export interface ReferenceCountResult {
  readonly symbol: string;
  readonly referenceCount: number;
  readonly referencingFiles: readonly string[];
}

export interface ReferenceCountOptions {
  readonly projectRoot: string;
  readonly git: GitClient;
  readonly process: ProcessRunner;
  /** Narrow search to references of the symbol defined in this file. */
  readonly filePath?: string;
}

// ---- Ripgrep / grep search ------------------------------------------------

function buildRipgrepArgs(symbol: string, filePaths: readonly string[]): readonly string[] {
  return [
    "--no-heading",
    "--files-with-matches",
    "--color", "never",
    "-w",
    "-e", symbol,
    "--",
    ...filePaths,
  ];
}

function buildGrepArgs(symbol: string, filePaths: readonly string[]): readonly string[] {
  return [
    "-lw",
    "-F",
    symbol,
    "--",
    ...filePaths,
  ];
}

function runFilesWithMatches(
  projectRoot: string,
  symbol: string,
  filePaths: readonly string[],
  process: ProcessRunner,
): readonly string[] {
  if (filePaths.length === 0) return [];

  const rg = process.run({
    command: "rg",
    args: buildRipgrepArgs(symbol, filePaths),
    cwd: projectRoot,
  });

  if (rg.error === undefined) {
    if (rg.status === 0) {
      return parseFileList(rg.stdout);
    }
    if (rg.status === 1) {
      return [];
    }
    throw new Error(`ripgrep search failed: ${rg.stderr.trim()}`);
  }

  // Fallback to grep
  const grep = process.run({
    command: "grep",
    args: buildGrepArgs(symbol, filePaths),
    cwd: projectRoot,
  });

  if (grep.error === undefined) {
    if (grep.status === 0) {
      return parseFileList(grep.stdout);
    }
    if (grep.status === 1) {
      return [];
    }
    throw new Error(`grep search failed: ${grep.stderr.trim()}`);
  }

  const rgMsg = rg.error instanceof Error ? rg.error.message : String(rg.error);
  const grepMsg = grep.error instanceof Error ? grep.error.message : String(grep.error);
  throw new Error(
    `reference search failed: ripgrep unavailable (${rgMsg}); grep unavailable (${grepMsg})`,
  );
}

function parseFileList(stdout: string): readonly string[] {
  const trimmed = stdout.trim();
  if (trimmed.length === 0) return [];
  return trimmed.split("\n");
}

// ---- Git file listing (inlined to avoid cross-layer import) ---------------

async function listTrackedAndUntrackedFiles(
  projectRoot: string,
  git: GitClient,
): Promise<readonly string[]> {
  const result = await git.run({
    args: ["ls-files", "--cached", "--others", "--exclude-standard"],
    cwd: projectRoot,
  });
  if (result.error !== undefined || result.status !== 0) {
    const message = result.error !== undefined
      ? result.error.message
      : (result.stderr.trim() || `git exited ${String(result.status)}`);
    throw new Error(`git file listing failed: ${message}`);
  }
  const output = result.stdout.trim();
  return output.length === 0 ? [] : output.split("\n");
}

// ---- Public API -----------------------------------------------------------

/**
 * Count how many files reference a given symbol.
 *
 * Uses ripgrep (with grep fallback) to find files containing the symbol name,
 * then excludes the definition file when `filePath` is provided.
 */
export async function countSymbolReferences(
  symbolName: string,
  opts: ReferenceCountOptions,
): Promise<ReferenceCountResult> {
  const { projectRoot, git, process, filePath } = opts;

  const trackedFiles = await listTrackedAndUntrackedFiles(projectRoot, git);
  const matchingFiles = runFilesWithMatches(projectRoot, symbolName, trackedFiles, process);

  // Filter out the definition file when provided
  const referencingFiles = filePath !== undefined
    ? matchingFiles.filter((f) => f !== filePath)
    : matchingFiles;

  return {
    symbol: symbolName,
    referenceCount: referencingFiles.length,
    referencingFiles,
  };
}
