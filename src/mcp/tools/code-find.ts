import { z } from "zod";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";
import { GitFileQuery, listGitFiles } from "./git-files.js";
import {
  evaluatePrecisionPolicy,
  getIndexedCommitCeilings,
  loadFileContent,
  normalizeRepoPath,
  PrecisionSearchRequest,
  type PrecisionSymbolMatch,
  resolveGitRef,
  searchLiveSymbols,
  searchWarpSymbols,
} from "./precision.js";

class CodeFindRequest {
  readonly query: string;
  readonly kind?: string;
  readonly dirPath: string;

  constructor(args: Record<string, unknown>, projectRoot: string) {
    const query = args["query"];
    const kind = args["kind"];
    const rawPath = args["path"];
    if (typeof query !== "string" || query.trim().length === 0) {
      throw new Error("CodeFindRequest: query must be a non-empty string");
    }
    if (kind !== undefined && typeof kind !== "string") {
      throw new Error("CodeFindRequest: kind must be a string when provided");
    }
    if (rawPath !== undefined && typeof rawPath !== "string") {
      throw new Error("CodeFindRequest: path must be a string when provided");
    }

    this.query = query.trim();
    if (kind !== undefined && kind.trim().length > 0) this.kind = kind.trim();
    this.dirPath = rawPath !== undefined && rawPath.trim().length > 0
      ? normalizeRepoPath(projectRoot, rawPath)
      : "";
    Object.freeze(this);
  }

  toPrecisionSearchRequest(): PrecisionSearchRequest {
    return new PrecisionSearchRequest({
      query: this.query,
      ...(this.kind !== undefined ? { kind: this.kind } : {}),
      ...(this.dirPath.length > 0 ? { pathPrefix: this.dirPath } : {}),
    });
  }

  toProjectFileQuery(projectRoot: string): GitFileQuery {
    return GitFileQuery.project(projectRoot, this.dirPath);
  }
}

export const codeFindTool: ToolDefinition = {
  name: "code_find",
  description:
    "Search for symbols across the project by approximate name or glob " +
    "pattern. Returns matches with file path, kind, signature, and " +
    "line range. Use code_show to read the source of a specific match.",
  schema: {
    query: z.string(),
    kind: z.string().optional(),
    path: z.string().optional(),
  },
  policyCheck: true,
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      const request = new CodeFindRequest(args, ctx.projectRoot);
      const precisionRequest = request.toPrecisionSearchRequest();
      const repoState = ctx.getRepoState();
      const layer = repoState.dirty ? "workspace_overlay" : "ref_view";

      let allMatches: PrecisionSymbolMatch[] = [];
      let source: "warp" | "live" = "live";

      if (!repoState.dirty) {
        try {
          const warp = await ctx.getWarp();
          const ceilings = await getIndexedCommitCeilings(warp);
          const headSha = await resolveGitRef("HEAD", ctx.git, ctx.projectRoot);
          if (ceilings.has(headSha)) {
            allMatches = await searchWarpSymbols(warp, precisionRequest);
            source = "warp";
          }
        } catch {
          source = "live";
        }
      }

      if (source === "live") {
        allMatches = await searchLiveSymbols(
          ctx,
          (await listGitFiles(request.toProjectFileQuery(ctx.projectRoot), ctx.git)).paths,
          precisionRequest,
        );
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
          const loaded = await loadFileContent(ctx, match.path);
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
          query: request.query,
          kind: request.kind ?? null,
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
        query: request.query,
        kind: request.kind ?? null,
        matches: visibleMatches,
        total: visibleMatches.length,
        source,
        layer,
      });
    };
  },
};
