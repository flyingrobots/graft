import type { FileSystem } from "../ports/filesystem.js";
import type { GitClient } from "../ports/git.js";
import type { ProcessRunner } from "../ports/process-runner.js";
import { detectLang } from "../parser/lang.js";
import { extractOutlineAsync } from "../parser/outline.js";
import type { OutlineEntry } from "../parser/types.js";

export type StructuralTestCoverageKind = "structural_reference";
export type StructuralTestCoverageStatus = "covered" | "uncovered";

export interface StructuralTestCoverageSymbol {
  readonly name: string;
  readonly kind: string;
  readonly signature?: string | undefined;
  readonly status: StructuralTestCoverageStatus;
  readonly referenceCount: number;
  readonly referencingTestFiles: readonly string[];
}

export interface StructuralTestCoverageFile {
  readonly path: string;
  readonly symbols: readonly StructuralTestCoverageSymbol[];
}

export interface StructuralTestCoverageTotals {
  readonly sourceFiles: number;
  readonly testFiles: number;
  readonly exportedSymbols: number;
  readonly coveredSymbols: number;
  readonly uncoveredSymbols: number;
}

export interface StructuralTestCoverageMapResult {
  readonly sourcePath: string;
  readonly testPath: string;
  readonly coverageKind: StructuralTestCoverageKind;
  readonly totals: StructuralTestCoverageTotals;
  readonly limitations: readonly string[];
  readonly files: readonly StructuralTestCoverageFile[];
  readonly summary: string;
}

export interface StructuralTestCoverageMapOptions {
  readonly cwd: string;
  readonly fs: FileSystem;
  readonly git: GitClient;
  readonly process: ProcessRunner;
  readonly resolveWorkingTreePath: (filePath: string) => string;
  readonly sourcePath?: string | undefined;
  readonly testPath?: string | undefined;
}

interface SourceSymbol {
  readonly name: string;
  readonly kind: string;
  readonly signature?: string | undefined;
}

interface SourceFile {
  readonly path: string;
  readonly symbols: readonly SourceSymbol[];
}

interface ReferenceSearchResult {
  readonly referenceCount: number;
  readonly referencingTestFiles: readonly string[];
}

const DEFAULT_SOURCE_PATH = "src";
const DEFAULT_TEST_PATH = "test";
const GIT_FILE_LIST_TIMEOUT_MS = 10_000;
const GIT_FILE_LIST_MAX_BUFFER_BYTES = 2_000_000;
const REFERENCE_SEARCH_TIMEOUT_MS = 10_000;
const REFERENCE_SEARCH_MAX_BUFFER_BYTES = 2_000_000;

const LIMITATIONS = Object.freeze([
  "This is structural/reference coverage, not execution coverage.",
  "Imports or mentions may count as references even if no assertion executes the symbol.",
  "Missing references are review attention signals, not proof that behavior is untested.",
]);

function normalizeRepoDirectory(rawPath: string | undefined, fallback: string): string {
  const candidate = rawPath === undefined || rawPath.trim().length === 0 ? fallback : rawPath.trim();
  const forwardSlash = candidate.replaceAll("\\", "/");
  if (forwardSlash.startsWith("/") || /^[A-Za-z]:/.test(forwardSlash)) {
    throw new Error(`Path must be repository-relative: ${candidate}`);
  }

  const segments: string[] = [];
  for (const segment of forwardSlash.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (segments.length === 0) {
        throw new Error(`Path must stay inside the repository: ${candidate}`);
      }
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  return segments.length > 0 ? segments.join("/") : ".";
}

function gitLsFilesArgs(directory: string): readonly string[] {
  const args = ["ls-files", "--cached", "--others", "--exclude-standard"];
  if (directory !== ".") {
    args.push("--", directory);
  }
  return args;
}

function splitGitFileList(stdout: string): readonly string[] {
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .sort((a, b) => a.localeCompare(b));
}

async function listProjectFiles(
  cwd: string,
  git: GitClient,
  directory: string,
): Promise<readonly string[]> {
  const result = await git.run({
    cwd,
    args: gitLsFilesArgs(directory),
    timeoutMs: GIT_FILE_LIST_TIMEOUT_MS,
    maxBufferBytes: GIT_FILE_LIST_MAX_BUFFER_BYTES,
  });
  if (result.error !== undefined) {
    throw new Error(`git file listing failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = result.stderr.trim();
    throw new Error(`git file listing failed${detail.length > 0 ? `: ${detail}` : ""}`);
  }
  return splitGitFileList(result.stdout);
}

function sourceCodeFiles(paths: readonly string[]): readonly string[] {
  return paths.filter((filePath) => detectLang(filePath) !== null);
}

async function existingFiles(
  opts: StructuralTestCoverageMapOptions,
  paths: readonly string[],
): Promise<readonly string[]> {
  const checks = await Promise.all(paths.map(async (filePath) => {
    try {
      await opts.fs.stat(opts.resolveWorkingTreePath(filePath));
      return { filePath, exists: true };
    } catch {
      return { filePath, exists: false };
    }
  }));
  return checks
    .filter((check) => check.exists)
    .map((check) => check.filePath);
}

function collectExportedSymbols(entries: readonly OutlineEntry[]): SourceSymbol[] {
  const symbols: SourceSymbol[] = [];
  for (const entry of entries) {
    if (entry.exported && entry.kind !== "heading") {
      symbols.push({
        name: entry.name,
        kind: entry.kind,
        ...(entry.signature !== undefined ? { signature: entry.signature } : {}),
      });
    }
    if (entry.children !== undefined) {
      symbols.push(...collectExportedSymbols(entry.children));
    }
  }
  return symbols;
}

async function parseSourceFile(
  opts: StructuralTestCoverageMapOptions,
  filePath: string,
): Promise<SourceFile | null> {
  const lang = detectLang(filePath);
  if (lang === null) {
    return null;
  }

  let content: string;
  try {
    content = await opts.fs.readFile(opts.resolveWorkingTreePath(filePath), "utf-8");
  } catch {
    return null;
  }

  const outline = await extractOutlineAsync(content, lang);
  const symbols = collectExportedSymbols(outline.entries)
    .sort((a, b) => a.name.localeCompare(b.name) || a.kind.localeCompare(b.kind));

  return { path: filePath, symbols };
}

function searchArgs(symbolName: string, testFiles: readonly string[]): readonly string[] {
  return [
    "--no-heading",
    "--line-number",
    "--column",
    "--color",
    "never",
    "--with-filename",
    "-F",
    "-e",
    symbolName,
    "--",
    ...testFiles,
  ];
}

function grepArgs(symbolName: string, testFiles: readonly string[]): readonly string[] {
  return ["-nH", "-F", symbolName, "--", ...testFiles];
}

function parseMatchedFiles(stdout: string): readonly string[] {
  if (stdout.trim().length === 0) {
    return [];
  }

  return stdout
    .trim()
    .split("\n")
    .map((line) => {
      const match = /^(.*?):\d+(?::\d+)?:/.exec(line);
      return match?.[1];
    })
    .filter((filePath): filePath is string => filePath !== undefined && filePath.length > 0);
}

function countSearchLines(stdout: string): number {
  if (stdout.trim().length === 0) {
    return 0;
  }
  return stdout.trim().split("\n").length;
}

function runReferenceSearch(
  cwd: string,
  process: ProcessRunner,
  symbolName: string,
  testFiles: readonly string[],
): ReferenceSearchResult {
  if (testFiles.length === 0) {
    return { referenceCount: 0, referencingTestFiles: [] };
  }

  const ripgrep = process.run({
    command: "rg",
    args: searchArgs(symbolName, testFiles),
    cwd,
    timeoutMs: REFERENCE_SEARCH_TIMEOUT_MS,
    maxBufferBytes: REFERENCE_SEARCH_MAX_BUFFER_BYTES,
  });

  if (ripgrep.error === undefined) {
    if (ripgrep.status === 0) {
      const files = [...new Set(parseMatchedFiles(ripgrep.stdout))].sort((a, b) => a.localeCompare(b));
      return {
        referenceCount: countSearchLines(ripgrep.stdout),
        referencingTestFiles: files,
      };
    }
    if (ripgrep.status === 1) {
      return { referenceCount: 0, referencingTestFiles: [] };
    }
    const detail = ripgrep.stderr.trim();
    throw new Error(`ripgrep test reference search failed${detail.length > 0 ? `: ${detail}` : ""}`);
  }

  const grep = process.run({
    command: "grep",
    args: grepArgs(symbolName, testFiles),
    cwd,
    timeoutMs: REFERENCE_SEARCH_TIMEOUT_MS,
    maxBufferBytes: REFERENCE_SEARCH_MAX_BUFFER_BYTES,
  });

  if (grep.error === undefined) {
    if (grep.status === 0) {
      const files = [...new Set(parseMatchedFiles(grep.stdout))].sort((a, b) => a.localeCompare(b));
      return {
        referenceCount: countSearchLines(grep.stdout),
        referencingTestFiles: files,
      };
    }
    if (grep.status === 1) {
      return { referenceCount: 0, referencingTestFiles: [] };
    }
    const detail = grep.stderr.trim();
    throw new Error(`grep test reference search failed${detail.length > 0 ? `: ${detail}` : ""}`);
  }

  throw new Error(
    `test reference search failed: ripgrep unavailable (${ripgrep.error.message}); grep unavailable (${grep.error.message})`,
  );
}

function renderSummary(totals: StructuralTestCoverageTotals): string {
  return [
    "Structural/reference coverage:",
    `${String(totals.coveredSymbols)} covered, ${String(totals.uncoveredSymbols)} uncovered`,
    `from ${String(totals.exportedSymbols)} exported symbols`,
    `across ${String(totals.sourceFiles)} source files and ${String(totals.testFiles)} test files.`,
  ].join(" ");
}

export async function structuralTestCoverageMap(
  opts: StructuralTestCoverageMapOptions,
): Promise<StructuralTestCoverageMapResult> {
  const sourcePath = normalizeRepoDirectory(opts.sourcePath, DEFAULT_SOURCE_PATH);
  const testPath = normalizeRepoDirectory(opts.testPath, DEFAULT_TEST_PATH);
  const [sourceFilePaths, testFilePaths] = await Promise.all([
    listProjectFiles(opts.cwd, opts.git, sourcePath),
    listProjectFiles(opts.cwd, opts.git, testPath),
  ]);

  const codeSourceFiles = sourceCodeFiles(sourceFilePaths);
  const codeTestFiles = await existingFiles(opts, sourceCodeFiles(testFilePaths));
  const sourceFiles = (await Promise.all(
    codeSourceFiles.map((filePath) => parseSourceFile(opts, filePath)),
  )).filter((file): file is SourceFile => file !== null);

  const files: StructuralTestCoverageFile[] = [];
  let coveredSymbols = 0;
  let uncoveredSymbols = 0;

  for (const sourceFile of sourceFiles) {
    const symbols: StructuralTestCoverageSymbol[] = [];
    for (const symbol of sourceFile.symbols) {
      const refs = runReferenceSearch(opts.cwd, opts.process, symbol.name, codeTestFiles);
      const status: StructuralTestCoverageStatus = refs.referenceCount > 0 ? "covered" : "uncovered";
      if (status === "covered") {
        coveredSymbols++;
      } else {
        uncoveredSymbols++;
      }
      symbols.push({
        name: symbol.name,
        kind: symbol.kind,
        ...(symbol.signature !== undefined ? { signature: symbol.signature } : {}),
        status,
        referenceCount: refs.referenceCount,
        referencingTestFiles: refs.referencingTestFiles,
      });
    }
    files.push({ path: sourceFile.path, symbols });
  }

  files.sort((a, b) => a.path.localeCompare(b.path));
  const totals: StructuralTestCoverageTotals = {
    sourceFiles: sourceFiles.length,
    testFiles: codeTestFiles.length,
    exportedSymbols: coveredSymbols + uncoveredSymbols,
    coveredSymbols,
    uncoveredSymbols,
  };

  return {
    sourcePath,
    testPath,
    coverageKind: "structural_reference",
    totals,
    limitations: LIMITATIONS,
    files,
    summary: renderSummary(totals),
  };
}
