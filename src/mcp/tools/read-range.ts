import { z } from "zod";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";
import { createRepoWorkspaceFromToolContext } from "../repo-workspace.js";
import { toJsonObject } from "../../operations/result-dto.js";

export const readRangeTool: ToolDefinition = {
  name: "read_range",
  description:
    "Read a bounded range of lines from a file. Maximum 250 lines. " +
    "Use jump table entries from file_outline or safe_read to target " +
    "specific symbols.",
  schema: { path: z.string(), start: z.number(), end: z.number() },
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      const workspace = createRepoWorkspaceFromToolContext(ctx);
      const result = await workspace.readRange({
        path: args["path"] as string,
        start: args["start"] as number,
        end: args["end"] as number,
      });
      if ("projection" in result) {
        ctx.metrics.recordRefusal();
      } else {
        ctx.metrics.recordRead();
      }
      return ctx.respond("read_range", toJsonObject(result));
    };
  },
};
