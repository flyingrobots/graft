import { z } from "zod";
import { readRange } from "../../operations/read-range.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";
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
    return async (args) => {
      const symbolName = args["symbol"] as string;
      const rawPath = args["path"] as string | undefined;
      const ref = args["ref"] as string | undefined;
      const targetPath = rawPath !== undefined ? normalizeRepoPath(ctx.projectRoot, rawPath) : undefined;
      const repoState = ctx.getRepoState();
      const layer = ref !== undefined
        ? "commit_worldline"
        : repoState.dirty
          ? "workspace_overlay"
          : "ref_view";

      let resolvedRef: string | undefined;
      if (ref !== undefined) {
        try {
          resolvedRef = resolveGitRef(ref, ctx.projectRoot);
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
          const repoPath = targetPath !== undefined ? requireRepoPath(ctx.projectRoot, targetPath) : undefined;
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
              : listTrackedFilesAtRef("", ctx.projectRoot, resolvedRef);
            locations = searchLiveSymbols(
              ctx,
              filePaths,
              new PrecisionSearchRequest({
              exactName: symbolName,
              }),
              resolvedRef,
            );
          }
        } catch {
          const repoPath = targetPath !== undefined ? requireRepoPath(ctx.projectRoot, targetPath) : undefined;
          const filePaths = repoPath !== undefined
            ? [repoPath]
            : listTrackedFilesAtRef("", ctx.projectRoot, resolvedRef);
          locations = searchLiveSymbols(
            ctx,
            filePaths,
            new PrecisionSearchRequest({
            exactName: symbolName,
            }),
            resolvedRef,
          );
          source = "live";
        }
      } else {
        const filePaths = targetPath !== undefined
          ? [targetPath]
          : listProjectFiles("", ctx.projectRoot);
        locations = searchLiveSymbols(
          ctx,
          filePaths,
          new PrecisionSearchRequest({
          exactName: symbolName,
          }),
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
          const loaded = loadFileContent(ctx, location.path, resolvedRef);
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

      const content = fileCache.get(loc.path) ?? loadFileContent(ctx, loc.path, resolvedRef);
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
    };
  },
};
