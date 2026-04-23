import { z } from "zod";
import type { ToolDefinition, ToolHandler } from "../context.js";

export const monitorNudgeTool: ToolDefinition = {
  name: "monitor_nudge",
  description:
    "Trigger an immediate re-index tick for a running monitor. " +
    "Use from post-commit hooks to notify graft that HEAD changed.",
  schema: {
    cwd: z.string(),
  },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      return ctx.respond("monitor_nudge", { ...await ctx.nudgeMonitor({
        cwd: args["cwd"] as string,
      }) });
    };
  },
};
