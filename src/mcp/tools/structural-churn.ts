import { z } from "zod";
import { structuralChurn, structuralChurnToJson } from "../../operations/structural-churn.js";
import { nodePathOps } from "../../adapters/node-paths.js";
import { symbolsForCommit } from "../../warp/structural-queries.js";
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
      const result = await structuralChurn({
        cwd: ctx.projectRoot,
        git: ctx.git,
        pathOps: nodePathOps,
        querySymbolsForCommit: (sha) => symbolsForCommit(warp, sha),
        path: args["path"] as string | undefined,
        limit: args["limit"] as number | undefined,
      });
      return ctx.respond("graft_churn", structuralChurnToJson(result));
    };
  },
};
