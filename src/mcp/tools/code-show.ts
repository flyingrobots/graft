import { z } from "zod";
import { readRange } from "../../operations/read-range.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";
import { nodePathOps } from "../../adapters/node-paths.js";
import { indexHead } from "../../warp/index-head.js";
import { symbolTimeline, type SymbolVersion } from "../../warp/symbol-timeline.js";
import { evaluateMcpRefusal, type McpPolicyRefusal } from "../policy.js";
import { listProjectFiles } from "./git-files.js";
import {
  evaluatePrecisionPolicy,
  getIndexedCommitCeilings,
  listTrackedFilesAtRef,
  loadFileContent,
  normalizeRepoPath,
  PrecisionSearchRequest,
  type PrecisionSymbolMatch,
  readRangeFromContent,
  requireRepoPath,
  resolveGitRef,
  searchLiveSymbols,
  searchWarpSymbols,
} from "./precision.js";

interface CodeShowOptions {
  readonly allowWarp: boolean;
}

function actualFromContent(content: string | null): { lines: number; bytes: number } {
  if (content === null) {
    return { lines: 0, bytes: 0 };
  }
  return {
    lines: content.split("\n").length,
    bytes: Buffer.byteLength(content),
  };
}

function toHistoryEntry(version: SymbolVersion): Record<string, unknown> {
  return {
    sha: version.sha,
    tick: version.tick,
    changeKind: version.changeKind,
    present: version.present,
    path: version.filePath,
    ...(version.signature !== undefined ? { signature: version.signature } : {}),
    ...(version.startLine !== undefined ? { startLine: version.startLine } : {}),
    ...(version.endLine !== undefined ? { endLine: version.endLine } : {}),
  };
}

async function historyPathRefusal(
  ctx: ToolContext,
  filePath: string,
): Promise<McpPolicyRefusal | null> {
  return evaluateMcpRefusal(ctx, filePath, actualFromContent(await loadFileContent(ctx, filePath)));
}

async function runCodeShowHistory(
  ctx: ToolContext,
  symbolName: string,
  targetPath: string | undefined,
  options: CodeShowOptions,
) {
  const layer = "commit_worldline";
  if (!options.allowWarp) {
    return ctx.respond("code_show", {
      symbol: symbolName,
      error: "Symbol history requires indexed WARP access",
      source: "live",
      layer,
    });
  }

  let repoPath: string | undefined;
  if (targetPath !== undefined) {
    try {
      repoPath = requireRepoPath(ctx.projectRoot, targetPath);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return ctx.respond("code_show", {
        symbol: symbolName,
        error: message,
        source: "warp",
        layer,
      });
    }

    const refusal = await historyPathRefusal(ctx, repoPath);
    if (refusal !== null) {
      return ctx.respond("code_show", {
        path: refusal.path,
        projection: "refused",
        reason: refusal.reason,
        reasonDetail: refusal.reasonDetail,
        next: [...refusal.next],
        actual: refusal.actual,
        source: "warp",
        layer,
      });
    }
  }

  const warp = await ctx.getWarp();
  const timeline = await symbolTimeline(warp, symbolName, repoPath);
  const history: Record<string, unknown>[] = [];
  let firstRefusal: McpPolicyRefusal | undefined;

  for (const version of timeline.versions) {
    const refusal = await historyPathRefusal(ctx, version.filePath);
    if (refusal !== null) {
      firstRefusal ??= refusal;
      continue;
    }
    history.push(toHistoryEntry(version));
  }

  if (history.length === 0 && firstRefusal !== undefined) {
    return ctx.respond("code_show", {
      path: firstRefusal.path,
      projection: "refused",
      reason: firstRefusal.reason,
      reasonDetail: firstRefusal.reasonDetail,
      next: [...firstRefusal.next],
      actual: firstRefusal.actual,
      source: "warp",
      layer,
    });
  }

  ctx.recordFootprint({
    paths: [
      ...new Set(
        history
          .map((entry) => entry["path"])
          .filter((value): value is string => typeof value === "string"),
      ),
    ],
    symbols: [symbolName],
    regions: history.flatMap((entry) => {
      const path = entry["path"];
      const startLine = entry["startLine"];
      const endLine = entry["endLine"];
      if (
        typeof path !== "string" ||
        typeof startLine !== "number" ||
        typeof endLine !== "number"
      ) {
        return [];
      }
      return [{ path, startLine, endLine }];
    }),
  });

  return ctx.respond("code_show", {
    symbol: symbolName,
    ...(repoPath !== undefined ? { path: repoPath } : {}),
    history,
    ...(history.length === 0 ? { error: `No indexed history for symbol '${symbolName}'` } : {}),
    source: "warp",
    layer,
  });
}

async function lazyIndexReadPaths(
  ctx: ToolContext,
  paths: readonly string[],
  dirty: boolean,
): Promise<void> {
  if (dirty || paths.length === 0) return;
  try {
    const warp = await ctx.getWarp();
    await indexHead({
      cwd: ctx.projectRoot,
      git: ctx.git,
      pathOps: nodePathOps,
      ctx: warp,
      paths: [...new Set(paths)],
    });
  } catch {
    // Lazy indexing is a cache refresh. It must not break the read response.
  }
}

export async function runCodeShow(
  ctx: ToolContext,
  args: Record<string, unknown>,
  options: CodeShowOptions,
) {
  const symbolName = args["symbol"] as string;
  const rawPath = args["path"] as string | undefined;
  const ref = args["ref"] as string | undefined;
  const history = args["history"] === true;
  const targetPath = rawPath !== undefined
    ? normalizeRepoPath(ctx.projectRoot, rawPath)
    : undefined;
  const repoState = ctx.getRepoState();
  const layer = ref !== undefined
    ? "commit_worldline"
    : repoState.dirty
      ? "workspace_overlay"
      : "ref_view";

  if (history && ref !== undefined) {
    return ctx.respond("code_show", {
      symbol: symbolName,
      error:
        "code_show history cannot be combined with ref; " +
        "omit ref to read the indexed symbol timeline",
      source: "warp",
      layer: "commit_worldline",
    });
  }

  if (history) {
    return runCodeShowHistory(ctx, symbolName, targetPath, options);
  }

  let resolvedRef: string | undefined;
  if (ref !== undefined) {
    try {
      resolvedRef = await resolveGitRef(ref, ctx.git, ctx.projectRoot);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return ctx.respond("code_show", {
        symbol: symbolName,
        error: message,
        source: "live",
        layer,
      });
    }
  }

  let locations: PrecisionSymbolMatch[];
  let source: "warp" | "live" = "live";

  if (resolvedRef !== undefined) {
    if (targetPath !== undefined) {
      try {
        requireRepoPath(ctx.projectRoot, targetPath);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return ctx.respond("code_show", {
          symbol: symbolName,
          error: message,
          source: "live",
          layer,
        });
      }
    }

    try {
      const repoPath = targetPath !== undefined
        ? requireRepoPath(ctx.projectRoot, targetPath)
        : undefined;
      if (options.allowWarp) {
        const warp = await ctx.getWarp();
        const ceilings = await getIndexedCommitCeilings(warp);
        const ceiling = ceilings.get(resolvedRef);
        if (ceiling !== undefined) {
          locations = await searchWarpSymbols(warp, new PrecisionSearchRequest({
            exactName: symbolName,
            ...(repoPath !== undefined ? { filePath: repoPath } : {}),
            ceiling,
          }));
          source = "warp";
        } else {
          const filePaths = repoPath !== undefined
            ? [repoPath]
            : await listTrackedFilesAtRef("", ctx.git, ctx.projectRoot, resolvedRef);
          locations = await searchLiveSymbols(
            ctx,
            filePaths,
            new PrecisionSearchRequest({ exactName: symbolName }),
            resolvedRef,
          );
        }
      } else {
        const filePaths = repoPath !== undefined
          ? [repoPath]
          : await listTrackedFilesAtRef("", ctx.git, ctx.projectRoot, resolvedRef);
        locations = await searchLiveSymbols(
          ctx,
          filePaths,
          new PrecisionSearchRequest({ exactName: symbolName }),
          resolvedRef,
        );
      }
    } catch {
      const repoPath = targetPath !== undefined
        ? requireRepoPath(ctx.projectRoot, targetPath)
        : undefined;
      const filePaths = repoPath !== undefined
        ? [repoPath]
        : await listTrackedFilesAtRef("", ctx.git, ctx.projectRoot, resolvedRef);
      locations = await searchLiveSymbols(
        ctx,
        filePaths,
        new PrecisionSearchRequest({ exactName: symbolName }),
        resolvedRef,
      );
      source = "live";
    }
  } else {
    const filePaths = targetPath !== undefined
      ? [targetPath]
      : await listProjectFiles("", ctx.projectRoot, ctx.git);
    locations = await searchLiveSymbols(
      ctx,
      filePaths,
      new PrecisionSearchRequest({ exactName: symbolName }),
    );
  }

  const visibleLocations: PrecisionSymbolMatch[] = [];
  const fileCache = new Map<string, string>();
  let firstRefusal:
    | {
      path: string;
      reason: string;
      reasonDetail: string;
      next: readonly string[];
      actual: { lines: number; bytes: number };
    }
    | undefined;

  for (const location of locations) {
    let content = fileCache.get(location.path);
    if (content === undefined) {
      const loaded = await loadFileContent(ctx, location.path, resolvedRef);
      if (loaded === null) continue;
      fileCache.set(location.path, loaded);
      content = loaded;
    }

    const refusal = evaluatePrecisionPolicy(ctx, location.path, content);
    if (refusal !== null) {
      firstRefusal ??= refusal;
      continue;
    }

    visibleLocations.push(location);
  }

  if (visibleLocations.length === 0) {
    if (firstRefusal !== undefined) {
      return ctx.respond("code_show", {
        path: firstRefusal.path,
        projection: "refused",
        reason: firstRefusal.reason,
        reasonDetail: firstRefusal.reasonDetail,
        next: [...firstRefusal.next],
        actual: firstRefusal.actual,
        source,
        layer,
      });
    }

    return ctx.respond("code_show", {
      symbol: symbolName,
      error: `Symbol '${symbolName}' not found`,
      source,
      layer,
    });
  }

  if (visibleLocations.length > 1) {
    ctx.recordFootprint({
      paths: [...new Set(visibleLocations.map((m) => m.path))],
      symbols: visibleLocations.map((m) => m.name),
    });
    await lazyIndexReadPaths(ctx, visibleLocations.map((m) => m.path), repoState.dirty);
    return ctx.respond("code_show", {
      symbol: symbolName,
      ambiguous: true,
      matches: visibleLocations,
      source,
      layer,
    });
  }

  const loc = visibleLocations[0];
  if (loc?.startLine === undefined || loc.endLine === undefined) {
    if (loc?.path !== undefined) {
      await lazyIndexReadPaths(ctx, [loc.path], repoState.dirty);
    }
    return ctx.respond("code_show", {
      symbol: symbolName,
      kind: loc?.kind,
      signature: loc?.signature,
      path: loc?.path,
      exported: loc?.exported,
      error: "Symbol found but line range unavailable — use read_range with file_outline",
      source,
      layer,
    });
  }

  const content = fileCache.get(loc.path) ?? await loadFileContent(ctx, loc.path, resolvedRef);
  if (content === null) {
    return ctx.respond("code_show", {
      symbol: symbolName,
      error: `File '${loc.path}' is no longer readable`,
      source,
      layer,
    });
  }

  const rangeResult = resolvedRef !== undefined
    ? readRangeFromContent(loc.path, content, loc.startLine, loc.endLine)
    : await readRange(ctx.resolvePath(loc.path), loc.startLine, loc.endLine, { fs: ctx.fs });

  ctx.recordFootprint({
    paths: [loc.path],
    symbols: [loc.name],
    regions: [{ path: loc.path, startLine: loc.startLine, endLine: loc.endLine }],
  });
  await lazyIndexReadPaths(ctx, [loc.path], repoState.dirty);

  return ctx.respond("code_show", {
    symbol: loc.name,
    kind: loc.kind,
    signature: loc.signature,
    path: loc.path,
    exported: loc.exported,
    startLine: loc.startLine,
    endLine: loc.endLine,
    content: rangeResult.content,
    truncated: rangeResult.truncated ?? false,
    ...(rangeResult.clipped === true ? { clipped: true } : {}),
    source,
    layer,
  });
}

export const codeShowTool: ToolDefinition = {
  name: "code_show",
  description:
    "Focus on a symbol by name and return its source code in one call. " +
    "Provide a path to target a specific file, or omit to search the " +
    "project. Returns source, signature, and location. With history=true, " +
    "returns the indexed WARP timeline for the symbol.",
  schema: {
    symbol: z.string(),
    path: z.string().optional(),
    ref: z.string().optional(),
    history: z.boolean().optional(),
  },
  createHandler(): ToolHandler {
    return (args, ctx) => runCodeShow(ctx, args, { allowWarp: true });
  },
};
