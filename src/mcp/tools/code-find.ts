import { z } from "zod";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";
import { listProjectFiles } from "./git-files.js";
import {
  evaluatePrecisionPolicy,
  getIndexedCommitCeilings,
  loadFileContent,
  normalizeRepoPath,
  type PrecisionSymbolMatch,
  resolveGitRef,
  searchLiveSymbols,
  searchWarpSymbols,
} from "./precision.js";

export const codeFindTool: ToolDefinition = {
  name: "code_find",
  description:
    "Search for symbols across the project by name pattern. Returns " +
    "matches with file path, kind, signature, and line range. Use " +
    "code_show to read the source of a specific match.",
  schema: {
    query: z.string(),
    kind: z.string().optional(),
    path: z.string().optional(),
  },
  policyCheck: true,
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      const query = args["query"] as string;
      const kindFilter = args["kind"] as string | undefined;
      const rawPath = (args["path"] as string | undefined) ?? "";
      const dirPath = rawPath.length > 0 ? normalizeRepoPath(ctx.projectRoot, rawPath) : "";
      const repoState = ctx.getRepoState();
      const layer = repoState.dirty ? "workspace_overlay" : "ref_view";

      let allMatches: PrecisionSymbolMatch[] = [];
      let source: "warp" | "live" = "live";

      if (!repoState.dirty) {
        try {
          const warp = await ctx.getWarp();
          const ceilings = await getIndexedCommitCeilings(warp);
          const headSha = resolveGitRef("HEAD", ctx.projectRoot);
          if (ceilings.has(headSha)) {
            allMatches = await searchWarpSymbols(warp, {
              query,
              ...(kindFilter !== undefined ? { kind: kindFilter } : {}),
              ...(dirPath.length > 0 ? { pathPrefix: dirPath } : {}),
            });
            source = "warp";
          }
        } catch {
          source = "live";
        }
      }

      if (source === "live") {
        allMatches = searchLiveSymbols(ctx, {
          filePaths: listProjectFiles(dirPath, ctx.projectRoot),
          query,
          ...(kindFilter !== undefined ? { kind: kindFilter } : {}),
        });
      }

      const visibleMatches: PrecisionSymbolMatch[] = [];
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

      for (const match of allMatches) {
        let content = fileCache.get(match.path);
        if (content === undefined) {
          const loaded = loadFileContent(ctx, match.path);
          if (loaded === null) continue;
          fileCache.set(match.path, loaded);
          content = loaded;
        }

        const refusal = evaluatePrecisionPolicy(ctx, match.path, content);
        if (refusal !== null) {
          firstRefusal ??= refusal;
          continue;
        }
        visibleMatches.push(match);
      }

      if (visibleMatches.length === 0 && firstRefusal !== undefined) {
        return ctx.respond("code_find", {
          query,
          kind: kindFilter ?? null,
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

      return ctx.respond("code_find", {
        query,
        kind: kindFilter ?? null,
        matches: visibleMatches,
        total: visibleMatches.length,
        source,
        layer,
      });
    };
  },
};
