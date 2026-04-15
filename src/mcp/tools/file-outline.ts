import { z } from "zod";
import { RepoWorkspace } from "../../operations/repo-workspace.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";
import { toPolicyPath } from "../policy.js";

export const fileOutlineTool: ToolDefinition = {
  name: "file_outline",
  description:
    "Structural skeleton of a file \u2014 function signatures, class shapes, " +
    "exports. Includes a jump table mapping each symbol to its line range " +
    "for targeted read_range follow-ups.",
  schema: { path: z.string() },
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      const workspace = new RepoWorkspace({
        projectRoot: ctx.projectRoot,
        fs: ctx.fs,
        codec: ctx.codec,
        graftignorePatterns: ctx.graftignorePatterns,
        resolvePath: (input) => ctx.resolvePath(input),
        toPolicyPath: (resolvedPath) => toPolicyPath(ctx.projectRoot, resolvedPath),
        session: ctx.session,
        cache: ctx.cache,
      });
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
