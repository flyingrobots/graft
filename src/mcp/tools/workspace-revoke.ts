import { z } from "zod";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

export const workspaceRevokeTool: ToolDefinition = {
  name: "workspace_revoke",
  description:
    "Revoke daemon authorization for a workspace while leaving any already-open sessions visible to the control plane.",
  schema: {
    cwd: z.string(),
  },
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      return ctx.respond("workspace_revoke", { ...await ctx.revokeWorkspace({
        cwd: args["cwd"] as string,
      }) });
    };
  },
};
