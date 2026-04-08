import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

export const workspaceStatusTool: ToolDefinition = {
  name: "workspace_status",
  description:
    "Return the current daemon workspace binding state and resolved capability profile.",
  createHandler(ctx: ToolContext): ToolHandler {
    return () => {
      return ctx.respond("workspace_status", ctx.getWorkspaceStatus());
    };
  },
};
