import type { ToolHandler, ToolContext } from "../context.js";

export function createStatsHandler(ctx: ToolContext): ToolHandler {
  return () => {
    const snap = ctx.metrics.snapshot();
    return Promise.resolve(ctx.respond("stats", {
      totalReads: snap.reads,
      totalOutlines: snap.outlines,
      totalRefusals: snap.refusals,
      totalCacheHits: snap.cacheHits,
      totalBytesAvoidedByCache: snap.bytesAvoided,
    }));
  };
}
