import type { ToolDefinition, ToolHandler } from "../context.js";

export const workspaceAuthorizationsTool: ToolDefinition = {
  name: "workspace_authorizations",
  description:
    "List daemon-authorized workspaces, their capability posture, and active bound-session counts.",
  createHandler(): ToolHandler {
    return async (_args, ctx) => {
      return ctx.respond("workspace_authorizations", {
        workspaces: await ctx.listWorkspaceAuthorizations(),
      });
    };
  },
};
