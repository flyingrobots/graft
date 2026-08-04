import { z } from "zod";
import { structuralReview } from "../../operations/structural-review.js";
import { toJsonObject } from "../../operations/result-dto.js";
import type { ToolDefinition, ToolHandler } from "../context.js";

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
      const headRef = head ?? "HEAD";
      const result = await structuralReview({
        cwd: ctx.projectRoot,
        fs: ctx.fs,
        git: ctx.git,
        resolveWorkingTreePath: (filePath) => ctx.resolvePath(filePath),
        base: args["base"] as string | undefined,
        head,
        countReferences: async (symbolName, filePath, candidateTargetFilePaths) => {
          const reading = await ctx.getStructuralReadingPort().countSymbolReferences({
            symbolName,
            filePath,
            ref: headRef,
            candidateTargetFilePaths,
          });
          return {
            referenceCount: reading.payload.referenceCount,
            referencingFiles: reading.payload.referencingFiles,
            warnings: reading.payload.referenceWarnings ?? [],
            confidence: reading.payload.referenceConfidence ??
              (reading.residualPosture === "complete" ? "complete" : "partial"),
          };
        },
      });
      ctx.recordFootprint({
        paths: result.files.map((f) => f.path),
      });
      return ctx.respond("graft_review", toJsonObject(result));
    };
  },
};
