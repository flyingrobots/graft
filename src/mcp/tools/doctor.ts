import { STATIC_THRESHOLDS } from "../../policy/evaluate.js";
import { topBurdenKind, totalNonReadBytesReturned } from "../burden.js";
import { buildRuntimeStagedTarget } from "../runtime-staged-target.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

export const doctorTool: ToolDefinition = {
  name: "doctor",
  description:
    "Runtime health check. Shows project root, parser status, active " +
    "thresholds, session depth, message count, and burden summary.",
  createHandler(ctx: ToolContext): ToolHandler {
    return () => {
      const repoState = ctx.getRepoState();
      const causalContext = ctx.getCausalContext();
      const metrics = ctx.metrics.snapshot();
      const topBurden = topBurdenKind(metrics.burdenByKind);
      return ctx.respond("doctor", {
        projectRoot: ctx.projectRoot,
        parserHealthy: true,
        thresholds: { lines: STATIC_THRESHOLDS.lines, bytes: STATIC_THRESHOLDS.bytes },
        sessionDepth: ctx.session.getSessionDepth(),
        totalMessages: ctx.session.getMessageCount(),
        burdenSummary: {
          totalBytesReturned: metrics.bytesReturned,
          totalNonReadBytesReturned: totalNonReadBytesReturned(metrics.burdenByKind),
          topKind: topBurden?.kind ?? null,
          topBytesReturned: topBurden?.bytesReturned ?? 0,
          topCalls: topBurden?.calls ?? 0,
        },
        runtimeObservability: ctx.observability,
        causalContext,
        checkoutEpoch: repoState.checkoutEpoch,
        lastTransition: repoState.lastTransition,
        workspaceOverlayId: repoState.workspaceOverlayId,
        workspaceOverlay: repoState.workspaceOverlay,
        stagedTarget: buildRuntimeStagedTarget(ctx.getWorkspaceStatus(), causalContext, repoState),
      });
    };
  },
};
