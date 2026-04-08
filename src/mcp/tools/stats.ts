import { totalNonReadBytesReturned } from "../burden.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

export const statsTool: ToolDefinition = {
  name: "stats",
  description:
    "Decision metrics for the current session. Total reads, outlines, " +
    "refusals, cache hits, bytes avoided, and burden by tool kind.",
  createHandler(ctx: ToolContext): ToolHandler {
    return () => {
      const snap = ctx.metrics.snapshot();
      return ctx.respond("stats", {
        totalReads: snap.reads,
        totalOutlines: snap.outlines,
        totalRefusals: snap.refusals,
        totalCacheHits: snap.cacheHits,
        totalBytesReturned: snap.bytesReturned,
        totalBytesAvoidedByCache: snap.bytesAvoided,
        totalNonReadBytesReturned: totalNonReadBytesReturned(snap.burdenByKind),
        burdenByKind: snap.burdenByKind,
      });
    };
  },
};
