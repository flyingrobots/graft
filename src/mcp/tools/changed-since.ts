import { z } from "zod";
import { toJsonObject } from "../../operations/result-dto.js";
import type { ToolDefinition, ToolHandler } from "../context.js";
import { createRepoWorkspaceFromToolContext } from "../repo-workspace.js";

export const changedSinceTool: ToolDefinition = {
  name: "changed_since",
  description:
    "Check if a file changed since it was last read. Returns structural " +
    "diff (added/removed/changed symbols) or 'unchanged'. Peek mode by " +
    "default; pass consume: true to update the observation cache.",
  schema: { path: z.string(), consume: z.boolean().optional(), cwd: z.string().optional() },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const filePath = ctx.resolvePath(args["path"] as string);
      ctx.recordFootprint({ paths: [filePath] });
      const workspace = createRepoWorkspaceFromToolContext(ctx);
      const result = await workspace.changedSince({
        path: args["path"] as string,
        consume: args["consume"] as boolean | undefined,
      });
      return ctx.respond("changed_since", toJsonObject(result));
    };
  },
};
