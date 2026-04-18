import { z } from "zod";
import type { ToolDefinition, ToolHandler } from "../context.js";

export const monitorStartTool: ToolDefinition = {
  name: "monitor_start",
  description:
    "Start or resume the repo-scoped background index monitor for an authorized workspace.",
  schema: {
    cwd: z.string(),
    pollIntervalMs: z.number().int().positive().optional(),
  },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      return ctx.respond("monitor_start", { ...await ctx.startMonitor({
        cwd: args["cwd"] as string,
        pollIntervalMs: args["pollIntervalMs"] as number | undefined,
      }) });
    };
  },
};
