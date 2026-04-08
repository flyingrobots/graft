import * as path from "node:path";
import { execFileSync } from "node:child_process";
import picomatch from "picomatch";
import type WarpApp from "@git-stunts/git-warp";
import { getFileAtRef, GitError } from "../../git/diff.js";
import { detectLang } from "../../parser/lang.js";
import { extractOutline } from "../../parser/outline.js";
import type { JumpEntry, OutlineEntry } from "../../parser/types.js";
import { allSymbolsLens, fileSymbolsLens, symbolByNameLens } from "../../warp/observers.js";
import type { ToolContext } from "../context.js";
import { evaluateMcpRefusal, type McpPolicyRefusal } from "../policy.js";

const MAX_RANGE_LINES = 250;

export interface PrecisionSymbolMatch {
  name: string;
  kind: string;
  path: string;
  signature?: string | undefined;
  exported: boolean;
  startLine?: number | undefined;
  endLine?: number | undefined;
}

export type PrecisionPolicyRefusal = McpPolicyRefusal;

interface RankedPrecisionSymbolMatch {
  match: PrecisionSymbolMatch;
  score: number;
}

type SymbolQueryMode = "glob" | "plain";

interface SymbolQueryMatcher {
  mode: SymbolQueryMode;
  score(name: string): number | null;
}

function git(args: readonly string[], cwd: string): string {
  return execFileSync("git", [...args], {
    cwd,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function buildJumpLookup(
  jumpTable: readonly JumpEntry[],
): Map<string, { start: number; end: number }[]> {
  const lookup = new Map<string, { start: number; end: number }[]>();
  for (const entry of jumpTable) {
    const existing = lookup.get(entry.symbol) ?? [];
    existing.push({ start: entry.start, end: entry.end });
    lookup.set(entry.symbol, existing);
  }
  return lookup;
}

function decodeSymbolPath(nodeId: string): string | null {
  if (!nodeId.startsWith("sym:")) return null;
  const lastColon = nodeId.lastIndexOf(":");
  if (lastColon <= "sym:".length) return null;
  return nodeId.slice("sym:".length, lastColon);
}

function toMatch(
  nodeId: string,
  props: Record<string, unknown>,
): PrecisionSymbolMatch | null {
  const name = props["name"];
  const kind = props["kind"];
  const path = decodeSymbolPath(nodeId);
  if (typeof name !== "string" || typeof kind !== "string" || path === null) {
    return null;
  }

  return {
    name,
    kind,
    path,
    ...(typeof props["signature"] === "string" ? { signature: props["signature"] } : {}),
    exported: props["exported"] === true,
    ...(typeof props["startLine"] === "number" ? { startLine: props["startLine"] } : {}),
    ...(typeof props["endLine"] === "number" ? { endLine: props["endLine"] } : {}),
  };
}

function sortMatches(matches: PrecisionSymbolMatch[]): PrecisionSymbolMatch[] {
  return matches.sort((a, b) => a.path.localeCompare(b.path) || a.name.localeCompare(b.name));
}

function sortRankedMatches(
  matches: RankedPrecisionSymbolMatch[],
  mode: SymbolQueryMode,
): PrecisionSymbolMatch[] {
  return matches
    .sort((a, b) =>
      a.score - b.score ||
      (mode === "plain" ? a.match.name.length - b.match.name.length : 0) ||
      a.match.path.localeCompare(b.match.path) ||
      a.match.name.localeCompare(b.match.name)
    )
    .map((entry) => entry.match);
}

function hasGlobPattern(query: string): boolean {
  return picomatch.scan(query).isGlob;
}

function scorePlainSymbolQuery(name: string, query: string): number | null {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length === 0) return null;

  const loweredName = name.toLowerCase();
  const loweredQuery = normalizedQuery.toLowerCase();
  if (name === normalizedQuery) return 0;
  if (loweredName === loweredQuery) return 1;
  if (name.startsWith(normalizedQuery)) return 2;
  if (loweredName.startsWith(loweredQuery)) return 3;
  return loweredName.includes(loweredQuery) ? 4 : null;
}

function buildSymbolQueryMatcher(query: string | undefined): SymbolQueryMatcher | null {
  if (query === undefined) return null;
  if (hasGlobPattern(query)) {
    const matcher = picomatch(query, { nocase: true });
    return {
      mode: "glob",
      score(name: string) {
        return matcher(name) ? 0 : null;
      },
    };
  }

  return {
    mode: "plain",
    score(name: string) {
      return scorePlainSymbolQuery(name, query);
    },
  };
}

export function normalizeRepoPath(projectRoot: string, input: string): string {
  if (!path.isAbsolute(input)) return input;
  const rel = path.relative(projectRoot, input);
  if (rel === "") return ".";
  return rel.startsWith("..") ? input : rel;
}

export function requireRepoPath(projectRoot: string, input: string): string {
  const normalized = normalizeRepoPath(projectRoot, input);
  if (path.isAbsolute(normalized)) {
    throw new Error(`Path must be inside the repository for git-ref queries: ${input}`);
  }
  return normalized;
}

export function resolveGitRef(ref: string, cwd: string): string {
  try {
    return git(["rev-parse", "--verify", ref], cwd).trim();
  } catch {
    throw new GitError(`ref does not exist: ${ref}`);
  }
}

export function listTrackedFilesAtRef(dirPath: string, cwd: string, ref: string): string[] {
  try {
    const args = dirPath.length > 0
      ? ["ls-tree", "-r", "--name-only", ref, "--", dirPath]
      : ["ls-tree", "-r", "--name-only", ref];
    const output = git(args, cwd).trim();
    return output.length === 0 ? [] : output.split("\n");
  } catch {
    return [];
  }
}

export function isWorkingTreeDirty(cwd: string): boolean {
  try {
    return git(["status", "--porcelain"], cwd).trim().length > 0;
  } catch {
    return true;
  }
}

export async function getIndexedCommitCeilings(warp: WarpApp): Promise<ReadonlyMap<string, number>> {
  const { receipts } = await warp.core().materialize({ receipts: true });
  const ceilings = new Map<string, number>();

  for (const receipt of receipts) {
    const commitAdd = receipt.ops.find((op) =>
      op.op === "NodeAdd" &&
      op.result === "applied" &&
      op.target.startsWith("commit:")
    );
    if (commitAdd !== undefined) {
      ceilings.set(commitAdd.target.slice("commit:".length), receipt.lamport);
    }
  }

  return ceilings;
}

export function collectSymbols(
  entries: readonly OutlineEntry[],
  filePath: string,
  jumpTable: readonly JumpEntry[],
  jumpCursor: Map<string, number> = new Map<string, number>(),
): PrecisionSymbolMatch[] {
  const jumpLookup = buildJumpLookup(jumpTable);
  const results: PrecisionSymbolMatch[] = [];

  for (const entry of entries) {
    const candidates = jumpLookup.get(entry.name) ?? [];
    const jumpIndex = jumpCursor.get(entry.name) ?? 0;
    const jump = candidates[jumpIndex];
    if (jump !== undefined) {
      jumpCursor.set(entry.name, jumpIndex + 1);
    }
    results.push({
      name: entry.name,
      kind: entry.kind,
      path: filePath,
      signature: entry.signature,
      exported: entry.exported,
      startLine: jump?.start,
      endLine: jump?.end,
    });

    if (entry.children !== undefined && entry.children.length > 0) {
      results.push(...collectSymbols(entry.children, filePath, jumpTable, jumpCursor));
    }
  }

  return results;
}

export function loadFileContent(
  ctx: ToolContext,
  filePath: string,
  ref?: string,
): string | null {
  if (ref !== undefined) {
    return getFileAtRef(ref, filePath, ctx.projectRoot);
  }

  try {
    return ctx.fs.readFileSync(ctx.resolvePath(filePath), "utf-8");
  } catch {
    return null;
  }
}

export function evaluatePrecisionPolicy(
  ctx: ToolContext,
  filePath: string,
  content: string,
): PrecisionPolicyRefusal | null {
  const actual = {
    lines: content.split("\n").length,
    bytes: Buffer.byteLength(content),
  };
  return evaluateMcpRefusal(ctx, filePath, actual);
}

export async function searchWarpSymbols(
  warp: WarpApp,
  options: {
    exactName?: string | undefined;
    query?: string | undefined;
    kind?: string | undefined;
    filePath?: string | undefined;
    pathPrefix?: string | undefined;
    ceiling?: number | undefined;
  },
): Promise<PrecisionSymbolMatch[]> {
  const lens = options.filePath !== undefined
    ? fileSymbolsLens(options.filePath)
    : options.exactName !== undefined
      ? symbolByNameLens(options.exactName)
      : allSymbolsLens();
  const observer = await warp.observer(
    lens,
    options.ceiling !== undefined ? { source: { kind: "live", ceiling: options.ceiling } } : undefined,
  );
  const nodeIds = await observer.getNodes();
  const queryMatcher = buildSymbolQueryMatcher(options.query);

  const matches = await Promise.all(nodeIds.map(async (nodeId) => {
    const props = await observer.getNodeProps(nodeId);
    if (props === null) return null;
    const match = toMatch(nodeId, props);
    if (match === null) return null;
    if (options.exactName !== undefined && match.name !== options.exactName) return null;
    if (options.kind !== undefined && match.kind.toLowerCase() !== options.kind.toLowerCase()) return null;
    if (options.filePath !== undefined && match.path !== options.filePath) return null;
    if (options.pathPrefix !== undefined && !match.path.startsWith(options.pathPrefix)) return null;
    if (queryMatcher === null) return { match, score: 0 };
    const score = queryMatcher.score(match.name);
    return score === null ? null : { match, score };
  }));

  const visibleMatches = matches.filter((match): match is RankedPrecisionSymbolMatch => match !== null);
  if (queryMatcher === null) {
    return sortMatches(visibleMatches.map((entry) => entry.match));
  }
  return sortRankedMatches(visibleMatches, queryMatcher.mode);
}

export function searchLiveSymbols(
  ctx: ToolContext,
  options: {
    filePaths: readonly string[];
    exactName?: string | undefined;
    query?: string | undefined;
    kind?: string | undefined;
    ref?: string | undefined;
  },
): PrecisionSymbolMatch[] {
  const queryMatcher = buildSymbolQueryMatcher(options.query);
  const matches: RankedPrecisionSymbolMatch[] = [];

  for (const filePath of options.filePaths) {
    const lang = detectLang(filePath);
    if (lang === null) continue;

    const content = loadFileContent(ctx, filePath, options.ref);
    if (content === null) continue;

    const result = extractOutline(content, lang);
    const symbols = collectSymbols(result.entries, filePath, result.jumpTable ?? []);

    for (const symbol of symbols) {
      if (options.exactName !== undefined && symbol.name !== options.exactName) continue;
      if (options.kind !== undefined && symbol.kind.toLowerCase() !== options.kind.toLowerCase()) continue;
      if (queryMatcher === null) {
        matches.push({ match: symbol, score: 0 });
        continue;
      }
      const score = queryMatcher.score(symbol.name);
      if (score === null) continue;
      matches.push({ match: symbol, score });
    }
  }

  if (queryMatcher === null) {
    return sortMatches(matches.map((entry) => entry.match));
  }
  return sortRankedMatches(matches, queryMatcher.mode);
}

export function readRangeFromContent(
  filePath: string,
  content: string,
  start: number,
  end: number,
): {
  path: string;
  content?: string | undefined;
  startLine?: number | undefined;
  endLine?: number | undefined;
  truncated?: boolean | undefined;
  clipped?: boolean | undefined;
  reason?: string | undefined;
} {
  if (start > end) {
    return { path: filePath, reason: "INVALID_RANGE" };
  }

  const allLines = content.split("\n");
  const totalLines = allLines.length;
  let effectiveEnd = end;
  let truncated = false;
  let clipped = false;

  if (effectiveEnd - start + 1 > MAX_RANGE_LINES) {
    effectiveEnd = start + MAX_RANGE_LINES - 1;
    truncated = true;
  }

  if (effectiveEnd > totalLines) {
    effectiveEnd = totalLines;
    clipped = true;
  }

  return {
    path: filePath,
    content: allLines.slice(start - 1, effectiveEnd).join("\n"),
    startLine: start,
    endLine: effectiveEnd,
    ...(truncated ? { truncated: true, reason: "RANGE_EXCEEDED" } : {}),
    ...(clipped ? { clipped: true } : {}),
  };
}
