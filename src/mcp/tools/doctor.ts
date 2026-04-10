import { STATIC_THRESHOLDS } from "../../policy/evaluate.js";
import { topBurdenKind, totalNonReadBytesReturned } from "../burden.js";
import { buildRuntimeStagedTarget } from "../runtime-staged-target.js";
import { deriveCausalSurfaceNextAction } from "../semantic-transition-guidance.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

export const doctorTool: ToolDefinition = {
  name: "doctor",
  description:
    "Runtime health check. Shows project root, parser status, active " +
    "thresholds, session depth, message count, and burden summary.",
  createHandler(ctx: ToolContext): ToolHandler {
    return async () => {
      const repoState = ctx.getRepoState();
      const causalContext = ctx.getCausalContext();
      const workspaceOverlayFooting = await ctx.getWorkspaceOverlayFooting();
      const metrics = ctx.metrics.snapshot();
      const topBurden = topBurdenKind(metrics.burdenByKind);
      const persistedLocalHistory = await ctx.getPersistedLocalHistorySummary();
      const recommendedNextAction = deriveCausalSurfaceNextAction(
        persistedLocalHistory.nextAction,
        repoState.semanticTransition,
      );
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
        latestReadEvent: persistedLocalHistory.latestReadEvent,
        latestStageEvent: persistedLocalHistory.latestStageEvent,
        latestTransitionEvent: persistedLocalHistory.latestTransitionEvent,
        checkoutEpoch: repoState.checkoutEpoch,
        lastTransition: repoState.lastTransition,
        semanticTransition: repoState.semanticTransition,
        workspaceOverlayId: repoState.workspaceOverlayId,
        workspaceOverlay: repoState.workspaceOverlay,
        workspaceOverlayFooting,
        stagedTarget: buildRuntimeStagedTarget(
          ctx.getWorkspaceStatus(),
          causalContext,
          repoState,
          persistedLocalHistory.attribution,
        ),
        attribution: persistedLocalHistory.attribution,
        persistedLocalHistory,
        recommendedNextAction,
      });
    };
  },
};
