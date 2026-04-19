import { z } from "zod";
import { structuralReview } from "../../operations/structural-review.js";
import { toJsonObject } from "../../operations/result-dto.js";
import type { ToolDefinition, ToolHandler } from "../context.js";
import { nodeProcessRunner } from "../../adapters/node-process-runner.js";
import { countSymbolReferences } from "../../warp/reference-count.js";

export const structuralReviewTool: ToolDefinition = {
  name: "graft_review",
  description:
    "Zero-noise structural PR review. Categorizes changed files as " +
    "structural, formatting, test, docs, or config. Detects breaking " +
    "changes (removed exports, changed signatures) with impact counts.",
  schema: { base: z.string().optional(), head: z.string().optional() },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const result = await structuralReview({
        cwd: ctx.projectRoot,
        fs: ctx.fs,
        git: ctx.git,
        resolveWorkingTreePath: (filePath) => ctx.resolvePath(filePath),
        base: args["base"] as string | undefined,
        head: args["head"] as string | undefined,
        countReferences: async (symbolName, filePath) => {
          const refs = await countSymbolReferences(symbolName, {
            projectRoot: ctx.projectRoot,
            git: ctx.git,
            process: nodeProcessRunner,
            filePath,
          });
          return {
            referenceCount: refs.referenceCount,
            referencingFiles: refs.referencingFiles,
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
