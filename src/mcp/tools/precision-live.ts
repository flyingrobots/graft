import { getFileAtRef } from "../../git/diff.js";
import { detectLang } from "../../parser/lang.js";
import { extractOutline } from "../../parser/outline.js";
import type { JumpEntry, OutlineEntry } from "../../parser/types.js";
import type { ToolContext } from "../context.js";
import { evaluateMcpRefusal, type McpPolicyRefusal } from "../policy.js";
import type { RankedPrecisionSymbolMatch } from "./precision-query.js";
import { PrecisionSearchRequest } from "./precision-query.js";
import { PrecisionSymbolMatch } from "./precision-match.js";

const MAX_RANGE_LINES = 250;

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

export type PrecisionPolicyRefusal = McpPolicyRefusal;

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
