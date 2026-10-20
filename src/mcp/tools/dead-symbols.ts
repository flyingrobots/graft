import { z } from "zod";
import type { ToolDefinition, ToolHandler } from "../context.js";

export const deadSymbolsTool: ToolDefinition = {
  name: "graft_dead_symbols",
  description:
    "Dead symbol detection. Lists symbols removed in recent indexed commits " +
    "that were not re-added, using WARP graph history only. Reports whether " +
    "the index covers every indexable file at HEAD and names the files it does not.",
  schema: {
    maxCommits: z.number().int().positive().optional(),
  },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const maxCommits = args["maxCommits"];
      const reading = await ctx.getStructuralReadingPort().findDeadSymbols({
        ...(typeof maxCommits === "number" ? { maxCommits } : {}),
      });
      const symbols = reading.payload.symbols;
      const sorted = [...symbols].sort((a, b) =>
        a.filePath.localeCompare(b.filePath) ||
        a.name.localeCompare(b.name) ||
        a.removedInCommit.localeCompare(b.removedInCommit)
      );
      ctx.recordFootprint({
        paths: sorted.map((symbol) => symbol.filePath),
        symbols: sorted.map((symbol) => symbol.name),
      });
      const coverage = reading.payload.coverage;
      const coverageNote = coverage === undefined
        ? ""
        : coverage.missingFiles === 0
          ? ` The index covers all ${String(coverage.domainFiles)} indexable files at ${coverage.basisCommit}.`
          : ` Partial: ${String(coverage.missingFiles)} indexable files are not covered by the index.`;
      return ctx.respond("graft_dead_symbols", {
        ...(typeof maxCommits === "number" ? { maxCommits } : {}),
        symbols: sorted,
        total: sorted.length,
        residualPosture: reading.residualPosture,
        ...(coverage !== undefined ? { coverage } : {}),
        summary: `${String(sorted.length)} dead symbols found in indexed WARP history.${coverageNote}`,
      });
    };
  },
};
