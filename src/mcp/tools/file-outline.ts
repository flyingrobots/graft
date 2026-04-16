import { z } from "zod";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";
import { createRepoWorkspaceFromToolContext } from "../repo-workspace.js";

export const fileOutlineTool: ToolDefinition = {
  name: "file_outline",
  description:
    "Structural skeleton of a file \u2014 function signatures, class shapes, " +
    "exports. Includes a jump table mapping each symbol to its line range " +
    "for targeted read_range follow-ups.",
  schema: { path: z.string() },
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      const workspace = createRepoWorkspaceFromToolContext(ctx);
      const result = await workspace.fileOutline({ path: args["path"] as string });
      if ("projection" in result && result.projection === "refused") {
        ctx.metrics.recordRefusal();
      } else if ("cacheHit" in result && result["cacheHit"] === true) {
        ctx.metrics.recordCacheHit(0);
      } else {
        ctx.metrics.recordOutline();
      }
      return ctx.respond("file_outline", result);
    };
  },
};
