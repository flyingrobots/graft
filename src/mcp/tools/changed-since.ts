import { z } from "zod";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";
import { createRepoWorkspaceFromToolContext } from "../repo-workspace.js";
import { toJsonObject } from "../../operations/result-dto.js";

export const changedSinceTool: ToolDefinition = {
  name: "changed_since",
  description:
    "Check if a file changed since it was last read. Returns structural " +
    "diff (added/removed/changed symbols) or 'unchanged'. Peek mode by " +
    "default; pass consume: true to update the observation cache.",
  schema: { path: z.string(), consume: z.boolean().optional() },
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      const workspace = createRepoWorkspaceFromToolContext(ctx);
      return ctx.respond("changed_since", toJsonObject(await workspace.changedSince({
        path: args["path"] as string,
        consume: args["consume"] as boolean | undefined,
      })));
    };
  },
};
