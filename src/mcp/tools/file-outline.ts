import { z } from "zod";
import type { ToolDefinition, ToolHandler } from "../context.js";
import { toJsonObject } from "../../operations/result-dto.js";
import { createRepoWorkspaceFromToolContext } from "../repo-workspace.js";

export const fileOutlineTool: ToolDefinition = {
  name: "file_outline",
  description:
    "Structural skeleton of a file \u2014 function signatures, class shapes, " +
    "exports. Includes a jump table mapping each symbol to its line range " +
    "for targeted read_range follow-ups.",
  schema: { path: z.string(), cwd: z.string().optional() },
  // No policyCheck wrapper. It read the file a third time purely to apply the
  // policy RepoWorkspace already applies, which is why safe_read never carried
  // it either. The workspace refuses with the same shape.
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const filePath = ctx.resolvePath(args["path"] as string);
      ctx.recordFootprint({ paths: [filePath] });

      // Through the workspace rather than straight at ctx.fs. This handler
      // reimplemented the cache-check and record dance around its own reads,
      // so policy could be evaluated against one version of a file and the
      // outline taken from another.
      const workspace = createRepoWorkspaceFromToolContext(ctx);
      const result = await workspace.fileOutline({ path: args["path"] as string });

      if ("projection" in result) {
        ctx.metrics.recordRefusal();
        return ctx.respond("file_outline", toJsonObject(result));
      }

      if (result.cacheHit === true) {
        ctx.metrics.recordCacheHit(result.actual?.bytes ?? 0);
      } else {
        ctx.metrics.recordOutline();
      }
      ctx.recordFootprint({ symbols: result.outline.map((e) => e.name) });

      return ctx.respond("file_outline", toJsonObject(result));
    };
  },
};
