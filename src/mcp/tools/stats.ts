import { totalNonReadBytesReturned } from "../burden.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";
import { toJsonObject } from "../../operations/result-dto.js";
import type { StatsResponse } from "./diagnostic-models.js";

export const statsTool: ToolDefinition = {
  name: "stats",
  description:
    "Decision metrics for the current session. Total reads, outlines, " +
    "refusals, cache hits, bytes avoided, and burden by tool kind.",
  createHandler(ctx: ToolContext): ToolHandler {
    return () => {
      const snap = ctx.metrics.snapshot();
      const response: StatsResponse = {
        totalReads: snap.reads,
        totalOutlines: snap.outlines,
        totalRefusals: snap.refusals,
        totalCacheHits: snap.cacheHits,
        totalBytesReturned: snap.bytesReturned,
        totalBytesAvoidedByCache: snap.bytesAvoided,
        totalNonReadBytesReturned: totalNonReadBytesReturned(snap.burdenByKind),
        burdenByKind: snap.burdenByKind,
      };
      return ctx.respond("stats", toJsonObject(response));
    };
  },
};
