import { z } from "zod";
import type { ToolDefinition, ToolHandler } from "../context.js";

export const monitorPauseTool: ToolDefinition = {
  name: "monitor_pause",
  description:
    "Pause the repo-scoped background index monitor for an authorized workspace.",
  schema: {
    cwd: z.string(),
  },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      return ctx.respond("monitor_pause", { ...await ctx.pauseMonitor({
        cwd: args["cwd"] as string,
      }) });
    };
  },
};
