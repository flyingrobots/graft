import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

export const statsTool: ToolDefinition = {
  name: "stats",
  description:
    "Decision metrics for the current session. Total reads, outlines, " +
    "refusals, cache hits, and bytes avoided.",
  createHandler(ctx: ToolContext): ToolHandler {
    return () => {
      const snap = ctx.metrics.snapshot();
      return ctx.respond("stats", {
        totalReads: snap.reads,
        totalOutlines: snap.outlines,
        totalRefusals: snap.refusals,
        totalCacheHits: snap.cacheHits,
        totalBytesAvoidedByCache: snap.bytesAvoided,
      });
    };
  },
};
