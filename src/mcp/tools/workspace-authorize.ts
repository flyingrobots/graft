import { z } from "zod";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

export const workspaceAuthorizeTool: ToolDefinition = {
  name: "workspace_authorize",
  description:
    "Authorize a workspace for daemon binding and optionally change its daemon capability posture.",
  schema: {
    cwd: z.string(),
    runCapture: z.boolean().optional(),
  },
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      return ctx.respond("workspace_authorize", { ...await ctx.authorizeWorkspace({
        cwd: args["cwd"] as string,
        runCapture: args["runCapture"] as boolean | undefined,
      }) });
    };
  },
};
