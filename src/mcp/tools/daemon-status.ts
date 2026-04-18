import type { ToolDefinition, ToolHandler } from "../context.js";

export const daemonStatusTool: ToolDefinition = {
  name: "daemon_status",
  description:
    "Return daemon-wide health, authorization counts, and default capability posture for the local control plane.",
  createHandler(): ToolHandler {
    return async (_args, ctx) => {
      return ctx.respond("daemon_status", { ...await ctx.getDaemonStatus() });
    };
  },
};
