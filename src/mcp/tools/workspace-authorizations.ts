import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

export const workspaceAuthorizationsTool: ToolDefinition = {
  name: "workspace_authorizations",
  description:
    "List daemon-authorized workspaces, their capability posture, and active bound-session counts.",
  createHandler(ctx: ToolContext): ToolHandler {
    return async () => {
      return ctx.respond("workspace_authorizations", {
        workspaces: await ctx.listWorkspaceAuthorizations(),
      });
    };
  },
};
