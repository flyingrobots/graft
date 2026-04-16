import * as path from "node:path";
import { getFileAtRef, GitError } from "../../git/diff.js";
import { detectLang } from "../../parser/lang.js";
import { extractOutline } from "../../parser/outline.js";
import type { JumpEntry, OutlineEntry } from "../../parser/types.js";
import type { WarpHandle } from "../../ports/warp.js";
import { allSymbolsLens, fileSymbolsLens, symbolByNameLens } from "../../warp/observers.js";
import type { GitClient } from "../../ports/git.js";
import type { ToolContext } from "../context.js";
import { evaluateMcpRefusal, type McpPolicyRefusal } from "../policy.js";
import { PrecisionSearchRequest, type RankedPrecisionSymbolMatch } from "./precision-query.js";
import { PrecisionSymbolMatch } from "./precision-match.js";

const MAX_RANGE_LINES = 250;

export { PrecisionSearchRequest } from "./precision-query.js";
export { PrecisionSymbolMatch } from "./precision-match.js";
export type PrecisionPolicyRefusal = McpPolicyRefusal;

async function git(gitClient: GitClient, args: readonly string[], cwd: string): Promise<string> {
  const result = await gitClient.run({ args, cwd });
  if (result.error !== undefined || result.status !== 0) {
    throw result.error ?? new Error(result.stderr.trim() || `git exited with status ${String(result.status)}`);
  }
  return result.stdout;
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

  return new PrecisionSymbolMatch({
    name,
    kind,
    path,
    ...(typeof props["signature"] === "string" ? { signature: props["signature"] } : {}),
    exported: props["exported"] === true,
    ...(typeof props["startLine"] === "number" ? { startLine: props["startLine"] } : {}),
    ...(typeof props["endLine"] === "number" ? { endLine: props["endLine"] } : {}),
  });
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

export async function resolveGitRef(ref: string, gitClient: GitClient, cwd: string): Promise<string> {
  try {
    return (await git(gitClient, ["rev-parse", "--verify", ref], cwd)).trim();
  } catch {
    throw new GitError(`ref does not exist: ${ref}`);
  }
}

export async function listTrackedFilesAtRef(
  dirPath: string,
  gitClient: GitClient,
  cwd: string,
  ref: string,
): Promise<string[]> {
  try {
    const args = dirPath.length > 0
      ? ["ls-tree", "-r", "--name-only", ref, "--", dirPath]
      : ["ls-tree", "-r", "--name-only", ref];
    const output = (await git(gitClient, args, cwd)).trim();
    return output.length === 0 ? [] : output.split("\n");
  } catch {
    return [];
  }
}

export async function isWorkingTreeDirty(gitClient: GitClient, cwd: string): Promise<boolean> {
  try {
    return (await git(gitClient, ["status", "--porcelain"], cwd)).trim().length > 0;
  } catch {
    return true;
  }
}

export async function getIndexedCommitCeilings(warp: WarpHandle): Promise<ReadonlyMap<string, number>> {
  const receipts = await warp.materializeReceipts();
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
    results.push(new PrecisionSymbolMatch({
      name: entry.name,
      kind: entry.kind,
      path: filePath,
      exported: entry.exported,
      ...(entry.signature !== undefined ? { signature: entry.signature } : {}),
      ...(jump?.start !== undefined ? { startLine: jump.start } : {}),
      ...(jump?.end !== undefined ? { endLine: jump.end } : {}),
    }));

    if (entry.children !== undefined && entry.children.length > 0) {
      results.push(...collectSymbols(entry.children, filePath, jumpTable, jumpCursor));
    }
  }

  return results;
}

export async function loadFileContent(
  ctx: ToolContext,
  filePath: string,
  ref?: string,
): Promise<string | null> {
  if (ref !== undefined) {
    return getFileAtRef(ref, filePath, { cwd: ctx.projectRoot, git: ctx.git });
  }

  try {
    return await ctx.fs.readFile(ctx.resolvePath(filePath), "utf-8");
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
  warp: WarpHandle,
  request: PrecisionSearchRequest,
): Promise<PrecisionSymbolMatch[]> {
  const lensMode = request.selectLens();
  if (lensMode === "file" && request.filePath === undefined) {
    throw new Error("PrecisionSearchRequest selected file lens without filePath");
  }
  if (lensMode === "exact" && request.exactName === undefined) {
    throw new Error("PrecisionSearchRequest selected exact lens without exactName");
  }
  let lens;
  if (lensMode === "file") {
    const filePath = request.filePath;
    if (filePath === undefined) {
      throw new Error("PrecisionSearchRequest selected file lens without filePath");
    }
    lens = fileSymbolsLens(filePath);
  } else if (lensMode === "exact") {
    const exactName = request.exactName;
    if (exactName === undefined) {
      throw new Error("PrecisionSearchRequest selected exact lens without exactName");
    }
    lens = symbolByNameLens(exactName);
  } else {
    lens = allSymbolsLens();
  }
  const observer = await warp.observer(
    lens,
    request.ceiling !== undefined ? { source: { kind: "live", ceiling: request.ceiling } } : undefined,
  );
  const nodeIds = await observer.getNodes();

  const matches = await Promise.all(nodeIds.map(async (nodeId) => {
    const props = await observer.getNodeProps(nodeId);
    if (props === null) return null;
    const match = toMatch(nodeId, props);
    if (match === null) return null;
    return request.rank(match);
  }));

  const visibleMatches = matches.filter((match): match is RankedPrecisionSymbolMatch => match !== null);
  return request.sort(visibleMatches);
}

export async function searchLiveSymbols(
  ctx: ToolContext,
  filePaths: readonly string[],
  request: PrecisionSearchRequest,
  ref?: string,
): Promise<PrecisionSymbolMatch[]> {
  const matches: RankedPrecisionSymbolMatch[] = [];

  for (const filePath of filePaths) {
    const lang = detectLang(filePath);
    if (lang === null) continue;

    const content = await loadFileContent(ctx, filePath, ref);
    if (content === null) continue;

    const result = extractOutline(content, lang);
    const symbols = collectSymbols(result.entries, filePath, result.jumpTable ?? []);

    for (const symbol of symbols) {
      const ranked = request.rank(symbol);
      if (ranked !== null) matches.push(ranked);
    }
  }

  return request.sort(matches);
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
