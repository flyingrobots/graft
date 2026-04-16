import { z } from "zod";
import { readRange } from "../../operations/read-range.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";
import {
  filterVisiblePrecisionMatches,
} from "./precision-visibility.js";
import {
  loadFileContent,
  normalizeRepoPath,
  readRangeFromContent,
} from "./precision.js";
import { resolveCodeShowLocations } from "./precision-show.js";

interface CodeShowOptions {
  readonly allowWarp: boolean;
}

export async function runCodeShow(
  ctx: ToolContext,
  args: Record<string, unknown>,
  options: CodeShowOptions,
) {
  const symbolName = args["symbol"] as string;
  const rawPath = args["path"] as string | undefined;
  const ref = args["ref"] as string | undefined;
  const targetPath = rawPath !== undefined ? normalizeRepoPath(ctx.projectRoot, rawPath) : undefined;
  let resolved;
  try {
    resolved = await resolveCodeShowLocations(ctx, {
      symbolName,
      targetPath,
      ref,
      allowWarp: options.allowWarp,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const layer = ref !== undefined ? "commit_worldline" : "live";
    return ctx.respond("code_show", {
      symbol: symbolName,
      error: message,
      source: "live",
      layer: layer === "live" ? "ref_view" : layer,
    });
  }

  const { visibleMatches: visibleLocations, fileCache, firstRefusal } = await filterVisiblePrecisionMatches(
    ctx,
    resolved.locations,
    resolved.resolvedRef,
  );

  if (visibleLocations.length === 0) {
    if (firstRefusal !== undefined) {
      return ctx.respond("code_show", {
        path: firstRefusal.path,
        projection: "refused",
        reason: firstRefusal.reason,
        reasonDetail: firstRefusal.reasonDetail,
        next: [...firstRefusal.next],
        actual: firstRefusal.actual,
        source: resolved.source,
        layer: resolved.layer,
      });
    }

    return ctx.respond("code_show", {
      symbol: symbolName,
      error: `Symbol '${symbolName}' not found`,
      source: resolved.source,
      layer: resolved.layer,
    });
  }

  if (visibleLocations.length > 1) {
    return ctx.respond("code_show", {
      symbol: symbolName,
      ambiguous: true,
      matches: visibleLocations,
      source: resolved.source,
      layer: resolved.layer,
    });
  }

  const loc = visibleLocations[0];
  if (loc?.startLine === undefined || loc.endLine === undefined) {
    return ctx.respond("code_show", {
      symbol: symbolName,
      kind: loc?.kind,
      signature: loc?.signature,
      path: loc?.path,
      identityId: loc?.identityId,
      exported: loc?.exported,
      error: "Symbol found but line range unavailable — use read_range with file_outline",
      source: resolved.source,
      layer: resolved.layer,
    });
  }

  const content = fileCache.get(loc.path) ?? await loadFileContent(ctx, loc.path, resolved.resolvedRef);
  if (content === null) {
    return ctx.respond("code_show", {
      symbol: symbolName,
      error: `File '${loc.path}' is no longer readable`,
      source: resolved.source,
      layer: resolved.layer,
    });
  }

  const rangeResult = resolved.resolvedRef !== undefined
    ? readRangeFromContent(loc.path, content, loc.startLine, loc.endLine)
    : await readRange(ctx.resolvePath(loc.path), loc.startLine, loc.endLine, { fs: ctx.fs });

  return ctx.respond("code_show", {
    symbol: loc.name,
    kind: loc.kind,
    signature: loc.signature,
    path: loc.path,
    identityId: loc.identityId,
    exported: loc.exported,
    startLine: loc.startLine,
    endLine: loc.endLine,
    content: rangeResult.content,
    truncated: rangeResult.truncated ?? false,
    ...(rangeResult.clipped === true ? { clipped: true } : {}),
    source: resolved.source,
    layer: resolved.layer,
  });
}

export const codeShowTool: ToolDefinition = {
  name: "code_show",
  description:
    "Focus on a symbol by name and return its source code in one call. " +
    "Provide a path to target a specific file, or omit to search the " +
    "project. Returns source, signature, and location.",
  schema: {
    symbol: z.string(),
    path: z.string().optional(),
    ref: z.string().optional(),
  },
  createHandler(ctx: ToolContext): ToolHandler {
    return (args) => runCodeShow(ctx, args, { allowWarp: true });
  },
};
