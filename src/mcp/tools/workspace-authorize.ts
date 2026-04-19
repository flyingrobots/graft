import { z } from "zod";
import type { ToolDefinition, ToolHandler } from "../context.js";

export const workspaceAuthorizeTool: ToolDefinition = {
  name: "workspace_authorize",
  description:
    "Authorize a workspace for daemon binding and optionally change its daemon capability posture.",
  schema: {
    cwd: z.string(),
    runCapture: z.boolean().optional(),
  },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      return ctx.respond("workspace_authorize", { ...await ctx.authorizeWorkspace({
        cwd: args["cwd"] as string,
        runCapture: args["runCapture"] as boolean | undefined,
      }) });
    };
  },
};
