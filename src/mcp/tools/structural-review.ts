import { z } from "zod";
import { structuralReview, type ReferenceCountResult } from "../../operations/structural-review.js";
import { scanQualifiedReferencesAtRef } from "../../warp/committed-reference-scan.js";
import { countSymbolReferencesFromGraph } from "../../warp/warp-reference-count.js";
import { toJsonObject } from "../../operations/result-dto.js";
import type { ToolContext, ToolDefinition, ToolHandler } from "../context.js";
import { nodePathOps } from "../../adapters/node-paths.js";

async function countReviewReferences(
  ctx: ToolContext,
  symbolName: string,
  filePath: string,
  headRef: string,
): Promise<ReferenceCountResult> {
  const graph = await countSymbolReferencesFromGraph(await ctx.getWarp(), symbolName, filePath);
  const scan = await scanQualifiedReferencesAtRef({ cwd: ctx.projectRoot, git: ctx.git, pathOps: nodePathOps, symbolName, filePath, ref: headRef });
  if (graph.referenceCount > 0) return {
    referenceCount: graph.referenceCount,
    referencingFiles: graph.referencingFiles,
    warnings: scan.warnings,
    confidence: scan.confidence,
  };
  return scan;
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
