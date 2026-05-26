import type { ToolDefinition, ToolHandler } from "../context.js";

export const workspaceListOpenedTool: ToolDefinition = {
  name: "workspace_list_opened",
  description:
    "List workspaces opened in this MCP session and identify the active workspace.",
  createHandler(): ToolHandler {
    return async (_args, ctx) => {
      return ctx.respond("workspace_list_opened", { ...await ctx.listOpenedWorkspaces() });
    };
  },
};
