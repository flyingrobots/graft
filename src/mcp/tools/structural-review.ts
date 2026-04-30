import { z } from "zod";
import { structuralReview, type ReferenceCountResult } from "../../operations/structural-review.js";
import { toJsonObject } from "../../operations/result-dto.js";
import type { ToolContext, ToolDefinition, ToolHandler } from "../context.js";
import { countSymbolReferencesFromGraph } from "../../warp/warp-reference-count.js";
import { nodePathOps } from "../../adapters/node-paths.js";
import { countNamedImportReferencesAtRef } from "../../operations/import-reference-impact.js";

async function countReviewReferences(
  ctx: ToolContext,
  symbolName: string,
  filePath: string,
  headRef: string,
): Promise<ReferenceCountResult> {
  const warpCtx = await ctx.getWarp();
  const graphResult = await countSymbolReferencesFromGraph(warpCtx, symbolName, filePath);
  if (graphResult.referenceCount > 0) {
    return graphResult;
  }

  try {
    const fallbackResult = await countNamedImportReferencesAtRef({
      cwd: ctx.projectRoot,
      git: ctx.git,
      pathOps: nodePathOps,
      symbolName,
      filePath,
      ref: headRef,
    });
    return fallbackResult.referenceCount > 0 ? fallbackResult : graphResult;
  } catch {
    return graphResult;
  }
}

export const structuralReviewTool: ToolDefinition = {
  name: "graft_review",
  description:
    "Zero-noise structural PR review. Categorizes changed files as " +
    "structural, formatting, test, docs, or config. Detects breaking " +
    "changes (removed exports, changed signatures) with impact counts.",
  schema: { base: z.string().optional(), head: z.string().optional() },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const head = args["head"] as string | undefined;
      const result = await structuralReview({
        cwd: ctx.projectRoot,
        fs: ctx.fs,
        git: ctx.git,
        resolveWorkingTreePath: (filePath) => ctx.resolvePath(filePath),
        base: args["base"] as string | undefined,
        head,
        countReferences: async (symbolName, filePath) => {
          return countReviewReferences(ctx, symbolName, filePath, head ?? "HEAD");
        },
      });
      ctx.recordFootprint({
        paths: result.files.map((f) => f.path),
      });
      return ctx.respond("graft_review", toJsonObject(result));
    };
  },
};
