import type { ToolDefinition, ToolHandler } from "../context.js";

export const daemonMonitorsTool: ToolDefinition = {
  name: "daemon_monitors",
  description:
    "List daemon-managed persistent repo monitors with lifecycle, backlog, and recent failure state.",
  createHandler(): ToolHandler {
    return async (_args, ctx) => {
      return ctx.respond("daemon_monitors", {
        monitors: await ctx.listDaemonMonitors(),
      });
    };
  },
};
