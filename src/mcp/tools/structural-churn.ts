import { z } from "zod";
import { structuralChurnToJson } from "../../operations/structural-churn.js";
import { structuralChurnFromGraph } from "../../warp/warp-structural-churn.js";
import type { ToolDefinition, ToolHandler } from "../context.js";

export const structuralChurnTool: ToolDefinition = {
  name: "graft_churn",
  description:
    "Structural churn report — which symbols change most frequently? " +
    "Identifies maintenance hotspots by walking indexed commits and " +
    "counting per-symbol change frequency.",
  schema: {
    path: z.string().optional(),
    limit: z.number().int().positive().optional(),
  },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const warp = await ctx.getWarp();
      const options: { path?: string; limit?: number } = {};
      const pathArg = args["path"];
      const limitArg = args["limit"];
      if (typeof pathArg === "string") options.path = pathArg;
      if (typeof limitArg === "number") options.limit = limitArg;
      const result = await structuralChurnFromGraph(warp, options);
      return ctx.respond("graft_churn", structuralChurnToJson(result));
    };
  },
};
