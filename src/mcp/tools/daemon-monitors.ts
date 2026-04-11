import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

export const daemonMonitorsTool: ToolDefinition = {
  name: "daemon_monitors",
  description:
    "List daemon-managed persistent repo monitors with lifecycle, backlog, and recent failure state.",
  createHandler(ctx: ToolContext): ToolHandler {
    return async () => {
      return ctx.respond("daemon_monitors", {
        monitors: await ctx.listDaemonMonitors(),
      });
    };
  },
};
