import type { ToolHandler, ToolContext } from "../context.js";

export const STATS_DESCRIPTION =
  "Decision metrics for the current session. Total reads, outlines, " +
  "refusals, cache hits, and bytes avoided.";

export function createStatsHandler(ctx: ToolContext): ToolHandler {
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
}
