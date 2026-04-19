import type { ToolDefinition, ToolHandler } from "../context.js";

export const workspaceStatusTool: ToolDefinition = {
  name: "workspace_status",
  description:
    "Return the current daemon workspace binding state and resolved capability profile.",
  createHandler(): ToolHandler {
    return (_args, ctx) => {
      return ctx.respond("workspace_status", { ...ctx.getWorkspaceStatus() });
    };
  },
};
