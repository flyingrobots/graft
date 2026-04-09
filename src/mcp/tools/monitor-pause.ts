import { z } from "zod";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

export const monitorPauseTool: ToolDefinition = {
  name: "monitor_pause",
  description:
    "Pause the repo-scoped background index monitor for an authorized workspace.",
  schema: {
    cwd: z.string(),
  },
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      return ctx.respond("monitor_pause", { ...await ctx.pauseMonitor({
        cwd: args["cwd"] as string,
      }) });
    };
  },
};
