import { z } from "zod";
import { structuralLogFromGraph } from "../../warp/warp-structural-log.js";
import { toJsonObject } from "../../operations/result-dto.js";
import type { ToolDefinition, ToolHandler } from "../context.js";

export const structuralLogTool: ToolDefinition = {
  name: "graft_log",
  description:
    "Structural git log — shows symbol-level changes (added, removed, " +
    "changed) per commit. Like `git log` but for code structure, not lines.",
  schema: {
    since: z.string().optional(),
    path: z.string().optional(),
    limit: z.number().optional(),
  },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const filePath = args["path"] as string | undefined;
      const limit = args["limit"] as number | undefined;
      const warp = await ctx.getWarp();

      const entries = await structuralLogFromGraph(warp, {
        path: filePath,
        limit,
      });

      ctx.recordFootprint({
        symbols: entries.flatMap((e) => [
          ...e.symbols.added.map((s) => s.name),
          ...e.symbols.removed.map((s) => s.name),
          ...e.symbols.changed.map((s) => s.name),
        ]),
      });

      return ctx.respond("graft_log", toJsonObject({
        entries,
        count: entries.length,
        layer: "commit_worldline",
      }));
    };
  },
};
