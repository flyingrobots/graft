import { buildRuntimeStagedTarget } from "../runtime-staged-target.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

export const causalStatusTool: ToolDefinition = {
  name: "causal_status",
  description:
    "Inspect the active causal workspace and persisted local-history posture.",
  createHandler(ctx: ToolContext): ToolHandler {
    return async () => {
      const workspaceStatus = ctx.getWorkspaceStatus();
      const persistedLocalHistory = await ctx.getPersistedLocalHistorySummary();
      if (workspaceStatus.bindState === "unbound") {
        return ctx.respond("causal_status", {
          ...workspaceStatus,
          activeCausalWorkspace: null,
          persistedLocalHistory,
          nextAction: persistedLocalHistory.nextAction,
        });
      }

      const repoState = ctx.getRepoState();
      const causalContext = ctx.getCausalContext();
      const workspaceOverlayFooting = await ctx.getWorkspaceOverlayFooting();
      return ctx.respond("causal_status", {
        ...workspaceStatus,
        activeCausalWorkspace: {
          causalContext,
          attribution: persistedLocalHistory.attribution,
          latestReadEvent: persistedLocalHistory.latestReadEvent,
          latestStageEvent: persistedLocalHistory.latestStageEvent,
          checkoutEpoch: repoState.checkoutEpoch,
          lastTransition: repoState.lastTransition,
          semanticTransition: repoState.semanticTransition,
          workspaceOverlayId: repoState.workspaceOverlayId,
          workspaceOverlay: repoState.workspaceOverlay,
          workspaceOverlayFooting,
          stagedTarget: buildRuntimeStagedTarget(
            workspaceStatus,
            causalContext,
            repoState,
            persistedLocalHistory.attribution,
          ),
        },
        persistedLocalHistory,
        nextAction: persistedLocalHistory.nextAction,
      });
    };
  },
};
