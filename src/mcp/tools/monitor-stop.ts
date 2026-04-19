import { z } from "zod";
import type { ToolDefinition, ToolHandler } from "../context.js";

export const monitorStopTool: ToolDefinition = {
  name: "monitor_stop",
  description:
    "Stop the repo-scoped background index monitor for an authorized workspace.",
  schema: {
    cwd: z.string(),
  },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      return ctx.respond("monitor_stop", { ...await ctx.stopMonitor({
        cwd: args["cwd"] as string,
      }) });
    };
  },
};
