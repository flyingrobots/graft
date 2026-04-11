import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

export const daemonStatusTool: ToolDefinition = {
  name: "daemon_status",
  description:
    "Return daemon-wide health, authorization counts, and default capability posture for the local control plane.",
  createHandler(ctx: ToolContext): ToolHandler {
    return async () => {
      return ctx.respond("daemon_status", { ...await ctx.getDaemonStatus() });
    };
  },
};
