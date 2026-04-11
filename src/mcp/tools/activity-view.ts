import { z } from "zod";
import { buildRuntimeStagedTarget } from "../runtime-staged-target.js";
import { deriveCausalSurfaceNextAction } from "../semantic-transition-guidance.js";
import type { PersistedLocalActivityItem } from "../persisted-local-history.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

const limitSchema = z.number().int().positive().max(50).optional();

type ActivityGroupKind = "transition" | "stage" | "continuity" | "read";

const GROUP_ORDER: readonly ActivityGroupKind[] = [
  "transition",
  "stage",
  "continuity",
  "read",
];

function classifyActivityItem(item: PersistedLocalActivityItem): ActivityGroupKind {
  if ("itemKind" in item) {
    return "continuity";
  }
  if (item.eventKind === "transition") {
    return "transition";
  }
  if (item.eventKind === "stage") {
    return "stage";
  }
  return "read";
}

function groupLabel(kind: ActivityGroupKind): string {
  switch (kind) {
    case "transition":
      return "semantic transitions";
    case "stage":
      return "staged activity";
    case "continuity":
      return "workspace continuity";
    case "read":
      return "read activity";
  }
}

function buildAnchor(workspaceBound: boolean, headRef: string | null, headSha: string | null) {
  if (!workspaceBound) {
    return {
      posture: "unknown" as const,
      headRef: null,
      headSha: null,
      reason: "workspace_unbound" as const,
    };
  }
  if (headSha === null) {
    return {
      posture: "unknown" as const,
      headRef,
      headSha: null,
      reason: "missing_head_commit" as const,
    };
  }
  return {
    posture: "head_commit" as const,
    headRef,
    headSha,
  };
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export const activityViewTool: ToolDefinition = {
  name: "activity_view",
  description:
    "Inspect bounded between-commit artifact history for the active workspace.",
  schema: {
    limit: limitSchema,
  },
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      const limit = limitSchema.parse(args["limit"]) ?? 20;
      const workspaceStatus = ctx.getWorkspaceStatus();

      if (workspaceStatus.bindState === "unbound") {
        return ctx.respond("activity_view", {
          ...workspaceStatus,
          truthClass: "artifact_history",
          anchor: buildAnchor(false, null, null),
          activeCausalWorkspace: null,
          activityWindow: {
            historyPath: null,
            limit,
            returned: 0,
            totalMatchingItems: 0,
            truncated: false,
            missingSignalKinds: ["write_events_not_captured"],
            groups: [],
          },
          degradedReasons: ["workspace_unbound", "anchor_unknown"],
          nextAction: "bind_workspace_to_begin_local_history",
        });
      }

      const repoState = ctx.getRepoState();
      const causalContext = ctx.getCausalContext();
      const persistedLocalHistory = await ctx.getPersistedLocalHistorySummary();
      const activityWindow = await ctx.getPersistedLocalActivityWindow(limit);
      const workspaceOverlayFooting = await ctx.getWorkspaceOverlayFooting();
      const repoConcurrency = await ctx.getRepoConcurrencySummary();
      const nextAction = deriveCausalSurfaceNextAction(
        persistedLocalHistory.nextAction,
        repoState.semanticTransition,
        repoConcurrency,
      );
      const stagedTarget = buildRuntimeStagedTarget(
        workspaceStatus,
        causalContext,
        repoState,
        persistedLocalHistory.attribution,
      );
      const anchor = buildAnchor(true, repoState.headRef, repoState.headSha);
      const workspaceOverlayDegradedReason = workspaceOverlayFooting?.degradedReason ?? null;

      const groups = GROUP_ORDER.map((groupKind) => {
        const items = activityWindow.items.filter((item) => classifyActivityItem(item) === groupKind);
        if (items.length === 0) {
          return null;
        }
        return {
          groupKind,
          label: groupLabel(groupKind),
          count: items.length,
          items,
        };
      }).filter((group) => group !== null);

      const degradedReasons = unique([
        ...(anchor.posture === "unknown" ? ["anchor_unknown"] : []),
        ...(workspaceOverlayDegradedReason === null ? [] : [workspaceOverlayDegradedReason]),
        ...(stagedTarget.availability === "ambiguous" ? ["staged_target_ambiguous"] : []),
        ...(repoConcurrency !== null && repoConcurrency.posture !== "exclusive"
          ? [repoConcurrency.posture]
          : []),
      ]);

      return ctx.respond("activity_view", {
        ...workspaceStatus,
        truthClass: "artifact_history",
        anchor,
        activeCausalWorkspace: {
          causalContext,
          attribution: persistedLocalHistory.attribution,
          repoConcurrency,
          checkoutEpoch: repoState.checkoutEpoch,
          lastTransition: repoState.lastTransition,
          semanticTransition: repoState.semanticTransition,
          workspaceOverlayId: repoState.workspaceOverlayId,
          workspaceOverlay: repoState.workspaceOverlay,
          workspaceOverlayFooting,
          stagedTarget,
        },
        activityWindow: {
          historyPath: activityWindow.historyPath,
          limit: activityWindow.limit,
          returned: activityWindow.items.length,
          totalMatchingItems: activityWindow.totalMatchingItems,
          truncated: activityWindow.truncated,
          missingSignalKinds: ["write_events_not_captured"],
          groups,
        },
        degradedReasons,
        nextAction,
      });
    };
  },
};
