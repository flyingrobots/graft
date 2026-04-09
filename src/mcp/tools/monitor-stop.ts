import { z } from "zod";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

export const monitorStopTool: ToolDefinition = {
  name: "monitor_stop",
  description:
    "Stop the repo-scoped background index monitor for an authorized workspace.",
  schema: {
    cwd: z.string(),
  },
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      return ctx.respond("monitor_stop", { ...await ctx.stopMonitor({
        cwd: args["cwd"] as string,
      }) });
    };
  },
};
