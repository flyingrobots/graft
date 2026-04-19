import { z } from "zod";
import type { ToolDefinition, ToolHandler } from "../context.js";

export const monitorResumeTool: ToolDefinition = {
  name: "monitor_resume",
  description:
    "Resume a paused repo-scoped background index monitor for an authorized workspace.",
  schema: {
    cwd: z.string(),
  },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      return ctx.respond("monitor_resume", { ...await ctx.resumeMonitor({
        cwd: args["cwd"] as string,
      }) });
    };
  },
};
