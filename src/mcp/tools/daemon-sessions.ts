import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

export const daemonSessionsTool: ToolDefinition = {
  name: "daemon_sessions",
  description:
    "List active daemon sessions with bind state, workspace identity, and capability posture, without exposing session-local receipts or shell output.",
  createHandler(ctx: ToolContext): ToolHandler {
    return async () => {
      return ctx.respond("daemon_sessions", {
        sessions: await ctx.listDaemonSessions(),
      });
    };
  },
};
