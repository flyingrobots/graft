import { z } from "zod";
import { toJsonObject } from "../../operations/result-dto.js";
import { refactorDifficultyFromGraph } from "../../warp/refactor-difficulty.js";
import type { ToolDefinition, ToolHandler } from "../context.js";

export const refactorDifficultyTool: ToolDefinition = {
  name: "graft_difficulty",
  description:
    "Refactor difficulty score for a symbol. Combines WARP aggregate " +
    "churn curvature with WARP reference-edge friction so agents can " +
    "choose refactor vs workaround.",
  schema: {
    symbol: z.string(),
    path: z.string().optional(),
    limit: z.number().int().positive().optional(),
  },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const symbol = args["symbol"];
      const rawPath = args["path"];
      const rawLimit = args["limit"];

      if (typeof symbol !== "string" || symbol.trim().length === 0) {
        throw new Error("graft_difficulty: symbol must be a non-empty string");
      }

      const warp = await ctx.getWarp();
      const result = await refactorDifficultyFromGraph(warp, {
        symbol,
        ...(typeof rawPath === "string" ? { path: rawPath } : {}),
        ...(typeof rawLimit === "number" ? { limit: rawLimit } : {}),
      });

      ctx.recordFootprint({
        symbols: [symbol.trim()],
        paths: result.entries.map((entry) => entry.filePath),
      });

      return ctx.respond("graft_difficulty", toJsonObject(result));
    };
  },
};
