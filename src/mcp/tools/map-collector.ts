// ---------------------------------------------------------------------------
// Structural map collector — models and collection logic for graft_map
// ---------------------------------------------------------------------------

import * as path from "node:path";
import { extractOutline } from "../../parser/outline.js";
import { detectLang } from "../../parser/lang.js";
import type { FileSystem } from "../../ports/filesystem.js";
import type { GitClient } from "../../ports/git.js";
import { GitFileQuery, listGitFiles } from "./git-files.js";
import type { McpPolicyRefusal } from "../policy.js";
import { collectSymbols, normalizeRepoPath } from "./precision.js";

// ---------------------------------------------------------------------------
// Request model
// ---------------------------------------------------------------------------

export class StructuralMapRequest {
  readonly directory: string;
  readonly depth: number | null;
  readonly summary: boolean;

  constructor(args: Record<string, unknown>, projectRoot: string) {
    const rawPath = args["path"];
    const rawDepth = args["depth"];
    const rawSummary = args["summary"];
    if (rawPath !== undefined && typeof rawPath !== "string") {
      throw new Error("StructuralMapRequest: path must be a string when provided");
    }
    let depth: number | null = null;
    if (rawDepth !== undefined) {
      if (typeof rawDepth !== "number" || !Number.isInteger(rawDepth) || rawDepth < 0) {
        throw new Error("StructuralMapRequest: depth must be a non-negative integer when provided");
      }
      depth = rawDepth;
    }
    if (rawSummary !== undefined && typeof rawSummary !== "boolean") {
      throw new Error("StructuralMapRequest: summary must be a boolean when provided");
    }
    this.directory = rawPath !== undefined && rawPath.trim().length > 0
      ? normalizeRepoPath(projectRoot, rawPath)
      : ".";
    this.depth = depth;
    this.summary = rawSummary === true;
    Object.freeze(this);
  }

  toGitFileQuery(projectRoot: string): GitFileQuery {
    return GitFileQuery.project(projectRoot, this.directory === "." ? "" : this.directory);
  }
}

// ---------------------------------------------------------------------------
// Result models
// ---------------------------------------------------------------------------

export class StructuralMapSymbol {
  readonly name: string;
  readonly kind: string;
  readonly signature?: string;
  readonly exported: boolean;
  readonly startLine?: number;
  readonly endLine?: number;

  constructor(opts: {
    name: string;
    kind: string;
    signature?: string;
    exported: boolean;
    startLine?: number;
    endLine?: number;
  }) {
    this.name = opts.name;
    this.kind = opts.kind;
    this.exported = opts.exported;
    if (opts.signature !== undefined) this.signature = opts.signature;
    if (opts.startLine !== undefined) this.startLine = opts.startLine;
    if (opts.endLine !== undefined) this.endLine = opts.endLine;
    Object.freeze(this);
  }
}

export class StructuralMapFile {
  readonly path: string;
  readonly lang: string;
  readonly symbolCount: number;
  readonly summaryOnly: boolean;
  readonly symbols?: readonly StructuralMapSymbol[];

  constructor(opts: {
    path: string;
    lang: string;
    symbolCount: number;
    summaryOnly: boolean;
    symbols?: readonly StructuralMapSymbol[];
  }) {
    this.path = opts.path;
    this.lang = opts.lang;
    this.symbolCount = opts.symbolCount;
    this.summaryOnly = opts.summaryOnly;
    if (opts.symbols !== undefined) {
      this.symbols = Object.freeze([...opts.symbols]);
    }
    Object.freeze(this);
  }
}

export class StructuralMapDirectory {
  readonly path: string;
  readonly fileCount: number;
  readonly symbolCount: number;
  readonly childDirectoryCount: number;
  readonly summaryOnly: true;

  constructor(opts: {
    path: string;
    fileCount: number;
    symbolCount: number;
    childDirectoryCount: number;
  }) {
    this.path = opts.path;
    this.fileCount = opts.fileCount;
    this.symbolCount = opts.symbolCount;
    this.childDirectoryCount = opts.childDirectoryCount;
    this.summaryOnly = true;
    Object.freeze(this);
  }
}

export class StructuralMapMode {
  readonly depth: number | null;
  readonly summary: boolean;

  constructor(opts: {
    depth: number | null;
    summary: boolean;
  }) {
    this.depth = opts.depth;
    this.summary = opts.summary;
    Object.freeze(this);
  }
}

// ---------------------------------------------------------------------------
// Directory accumulation
// ---------------------------------------------------------------------------

class StructuralMapDirectoryAccumulator {
  fileCount = 0;
  symbolCount = 0;
  readonly childDirectories = new Set<string>();

  add(symbolCount: number, childDirectory: string | null): void {
    this.fileCount += 1;
    this.symbolCount += symbolCount;
    if (childDirectory !== null) {
      this.childDirectories.add(childDirectory);
    }
  }

  toDirectory(pathname: string): StructuralMapDirectory {
    return new StructuralMapDirectory({
      path: pathname,
      fileCount: this.fileCount,
      symbolCount: this.symbolCount,
      childDirectoryCount: this.childDirectories.size,
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeDirectorySegments(scopeDir: string, filePath: string): string[] {
  const relativeFilePath = scopeDir === "." ? filePath : path.posix.relative(scopeDir, filePath);
  const relativeDirPath = path.posix.dirname(relativeFilePath);
  return relativeDirPath === "." ? [] : relativeDirPath.split("/").filter((segment) => segment.length > 0);
}

function summarizedDirectoryPath(scopeDir: string, filePath: string, depth: number | null): string | null {
  if (depth === null) return null;
  const segments = relativeDirectorySegments(scopeDir, filePath);
  if (segments.length <= depth) return null;
  const summarySegments = segments.slice(0, depth + 1);
  return scopeDir === "." ? summarySegments.join("/") : path.posix.join(scopeDir, ...summarySegments);
}

function summarizedChildDirectory(scopeDir: string, filePath: string, depth: number): string | null {
  const segments = relativeDirectorySegments(scopeDir, filePath);
  if (segments.length <= depth + 1) return null;
  return segments[depth + 1] ?? null;
}

function getOrCreateDirectoryAccumulator(
  accumulators: Map<string, StructuralMapDirectoryAccumulator>,
  pathname: string,
): StructuralMapDirectoryAccumulator {
  const existing = accumulators.get(pathname);
  if (existing !== undefined) return existing;
  const created = new StructuralMapDirectoryAccumulator();
  accumulators.set(pathname, created);
  return created;
}

function buildStructuralMapFile(opts: {
  path: string;
  lang: string;
  symbols: readonly StructuralMapSymbol[];
  summaryOnly: boolean;
}): StructuralMapFile {
  return new StructuralMapFile({
    path: opts.path,
    lang: opts.lang,
    symbolCount: opts.symbols.length,
    summaryOnly: opts.summaryOnly,
    ...(opts.summaryOnly ? {} : { symbols: opts.symbols }),
  });
}

function sortByPath<T extends { path: string }>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => a.path.localeCompare(b.path));
}

export function buildSummary(opts: {
  returnedFileCount: number;
  totalSymbolCount: number;
  summarizedDirectoryCount: number;
  depth: number | null;
  summary: boolean;
}): string {
  if (opts.depth === null && !opts.summary && opts.summarizedDirectoryCount === 0) {
    return `${String(opts.returnedFileCount)} files, ${String(opts.totalSymbolCount)} symbols`;
  }

  const parts = [
    `${String(opts.returnedFileCount)} files returned`,
    `${String(opts.totalSymbolCount)} total symbols`,
  ];
  if (opts.summarizedDirectoryCount > 0) {
    parts.push(`${String(opts.summarizedDirectoryCount)} summarized directories`);
  }
  if (opts.depth !== null) {
    parts.push(`depth=${String(opts.depth)}`);
  }
  if (opts.summary) {
    parts.push("summary mode");
  }
  return parts.join(", ");
}

// ---------------------------------------------------------------------------
// Collection orchestration
// ---------------------------------------------------------------------------

export interface StructuralMapCollectionResult {
  readonly files: StructuralMapFile[];
  readonly directories: StructuralMapDirectory[];
  readonly refused: McpPolicyRefusal[];
  readonly totalSymbols: number;
}

export async function collectStructuralMap(
  request: StructuralMapRequest,
  opts: {
    readonly projectRoot: string;
    readonly fs: FileSystem;
    readonly git: GitClient;
    readonly refusalCheck: (filePath: string, actual: { lines: number; bytes: number }) => McpPolicyRefusal | null;
  },
): Promise<StructuralMapCollectionResult> {
  const filePaths = (await listGitFiles(request.toGitFileQuery(opts.projectRoot), opts.git)).paths;
  const files: StructuralMapFile[] = [];
  const directories = new Map<string, StructuralMapDirectoryAccumulator>();
  const refused: McpPolicyRefusal[] = [];
  let totalSymbols = 0;

  for (const filePath of filePaths) {
    let content: string;
    try {
      content = await opts.fs.readFile(path.join(opts.projectRoot, filePath), "utf-8");
    } catch {
      continue;
    }

    const actual = {
      lines: content.split("\n").length,
      bytes: Buffer.byteLength(content),
    };
    const refusal = opts.refusalCheck(filePath, actual);
    if (refusal !== null) {
      refused.push(refusal);
      continue;
    }

    const lang = detectLang(filePath);
    if (lang === null) continue;

    const result = extractOutline(content, lang);
    const symbols = collectSymbols(result.entries, filePath, result.jumpTable ?? []).map((symbol) =>
      new StructuralMapSymbol({
        name: symbol.name,
        kind: symbol.kind,
        exported: symbol.exported,
        ...(symbol.signature !== undefined ? { signature: symbol.signature } : {}),
        ...(symbol.startLine !== undefined ? { startLine: symbol.startLine } : {}),
        ...(symbol.endLine !== undefined ? { endLine: symbol.endLine } : {}),
      })
    );
    totalSymbols += symbols.length;

    const clippedDirectoryPath = summarizedDirectoryPath(request.directory, filePath, request.depth);
    if (clippedDirectoryPath !== null && request.depth !== null) {
      const accumulator = getOrCreateDirectoryAccumulator(directories, clippedDirectoryPath);
      accumulator.add(
        symbols.length,
        summarizedChildDirectory(request.directory, filePath, request.depth),
      );
      continue;
    }

    files.push(buildStructuralMapFile({
      path: filePath,
      lang,
      symbols,
      summaryOnly: request.summary,
    }));
  }

  return {
    files: sortByPath(files),
    directories: sortByPath(
      [...directories.entries()].map(([pathname, accumulator]) => accumulator.toDirectory(pathname)),
    ),
    refused,
    totalSymbols,
  };
}
