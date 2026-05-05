import { z } from "zod";
import type { ToolDefinition, ToolHandler } from "../context.js";
import { findDeadSymbols } from "../../warp/dead-symbols.js";

export const deadSymbolsTool: ToolDefinition = {
  name: "graft_dead_symbols",
  description:
    "Dead symbol detection. Lists symbols removed in recent indexed commits " +
    "that were not re-added, using WARP graph history only.",
  schema: {
    maxCommits: z.number().int().positive().optional(),
  },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const maxCommits = args["maxCommits"];
      const warp = await ctx.getWarp();
      const symbols = await findDeadSymbols(warp, {
        ...(typeof maxCommits === "number" ? { maxCommits } : {}),
      });
      const sorted = [...symbols].sort((a, b) =>
        a.filePath.localeCompare(b.filePath) ||
        a.name.localeCompare(b.name) ||
        a.removedInCommit.localeCompare(b.removedInCommit)
      );
      ctx.recordFootprint({
        paths: sorted.map((symbol) => symbol.filePath),
        symbols: sorted.map((symbol) => symbol.name),
      });
      return ctx.respond("graft_dead_symbols", {
        ...(typeof maxCommits === "number" ? { maxCommits } : {}),
        symbols: sorted,
        total: sorted.length,
        summary: `${String(sorted.length)} dead symbols found in indexed WARP history.`,
      });
    };
  },
};
