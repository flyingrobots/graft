import { z } from "zod";
import type { ToolDefinition, ToolHandler } from "../context.js";

export const workspaceOpenTool: ToolDefinition = {
  name: "workspace_open",
  description:
    "Open a git worktree path in this MCP session and optionally make it the active workspace.",
  schema: {
    cwd: z.string(),
    activate: z.boolean().optional(),
    runCapture: z.boolean().optional(),
  },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const request = {
        cwd: args["cwd"] as string,
        activate: args["activate"] as boolean | undefined,
        runCapture: args["runCapture"] as boolean | undefined,
      };
      if (ctx.getWorkspaceStatus().sessionMode === "daemon") {
        const authorization = await ctx.authorizeWorkspace(request);
        if (!authorization.ok) {
          return ctx.respond("workspace_open", {
            ok: false,
            changed: false,
            freshSessionSlice: false,
            ...ctx.getWorkspaceStatus(),
            errorCode: authorization.errorCode,
            error: authorization.error,
          });
        }
      }
      return ctx.respond("workspace_open", { ...await ctx.openWorkspace(request) });
    };
  },
};
