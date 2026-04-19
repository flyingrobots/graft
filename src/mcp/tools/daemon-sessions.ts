import type { ToolDefinition, ToolHandler } from "../context.js";

export const daemonSessionsTool: ToolDefinition = {
  name: "daemon_sessions",
  description:
    "List active daemon sessions with bind state, workspace identity, and capability posture, without exposing session-local receipts or shell output.",
  createHandler(): ToolHandler {
    return async (_args, ctx) => {
      return ctx.respond("daemon_sessions", {
        sessions: await ctx.listDaemonSessions(),
      });
    };
  },
};
