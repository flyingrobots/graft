import { z } from "zod";
import { buildRuntimeStagedTarget } from "../runtime-staged-target.js";
import { deriveCausalSurfaceNextAction } from "../semantic-transition-guidance.js";
import type { PersistedLocalActivityItem } from "../persisted-local-history.js";
import type { ToolDefinition, ToolHandler } from "../context.js";

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

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

function countText(count: number): string {
  return String(count);
}

function shortSha(sha: string | null): string {
  return sha === null ? "unknown" : sha.slice(0, 7);
}

function describeAnchor(anchor: ReturnType<typeof buildAnchor>): string {
  if (anchor.posture === "unknown") {
    return anchor.reason === "workspace_unbound"
      ? "Anchor to the current Git commit is unavailable because no workspace is bound."
      : "Anchor to the current Git commit is unavailable because HEAD could not be resolved.";
  }

  const refLabel = anchor.headRef ?? "HEAD";
  return `Current commit anchor is ${refLabel} @ ${shortSha(anchor.headSha)}. This view summarizes recent bounded local artifact history for the active checkout epoch, not a complete since-commit ledger.`;
}

function describeStagedTarget(
  stagedTarget: ReturnType<typeof buildRuntimeStagedTarget>,
): string {
  switch (stagedTarget.availability) {
    case "none":
      return "No staged target is active.";
    case "full_file":
      return `Staged target is a full-file selection across ${countText(stagedTarget.target.selectionEntries.length)} ${pluralize(
        stagedTarget.target.selectionEntries.length,
        "path",
      )}.`;
    case "ambiguous":
      return `Staged target is ambiguous across ${countText(stagedTarget.observedStagedPaths)} staged ${pluralize(
        stagedTarget.observedStagedPaths,
        "path",
      )}.`;
  }
}

function describeWorkspace(
  repoConcurrency: { posture: string; summary: string } | null,
  semanticTransitionSummary: string | null,
  stagedTarget: ReturnType<typeof buildRuntimeStagedTarget>,
): string {
  return [
    repoConcurrency === null
      ? "Repo concurrency posture is unknown."
      : `Repo concurrency posture is ${repoConcurrency.posture}. ${repoConcurrency.summary}`,
    semanticTransitionSummary ?? "No active semantic transition is recorded.",
    describeStagedTarget(stagedTarget),
  ].join(" ");
}

function summarizeTransitionGroup(items: PersistedLocalActivityItem[]): string {
  const transitionItems = items.filter((item) => "eventKind" in item && item.eventKind === "transition");
  const latest = transitionItems[0];
  if (latest === undefined) {
    return "No semantic transitions are recorded.";
  }
  if (transitionItems.length === 1) {
    return `1 semantic transition recorded: ${latest.payload.summary}.`;
  }
  return `${countText(transitionItems.length)} semantic transitions recorded, latest: ${latest.payload.summary}.`;
}

function summarizeStageGroup(items: PersistedLocalActivityItem[]): string {
  const stageItems = items.filter((item) => "eventKind" in item && item.eventKind === "stage");
  const uniquePaths = new Set<string>();
  for (const item of stageItems) {
    for (const path of item.footprint.paths) {
      uniquePaths.add(path);
    }
  }
  return `${countText(stageItems.length)} staging ${pluralize(stageItems.length, "event")} across ${countText(uniquePaths.size)} ${pluralize(
    uniquePaths.size,
    "path",
  )}.`;
}

function summarizeContinuityGroup(items: PersistedLocalActivityItem[]): string {
  const continuityItems = items.filter((item) => "itemKind" in item);
  const operations = unique(continuityItems.map((item) => item.operation));
  return `${countText(continuityItems.length)} continuity ${pluralize(continuityItems.length, "change")} (${operations.join(", ")}).`;
}

function summarizeReadGroup(items: PersistedLocalActivityItem[]): string {
  const readItems = items.filter((item) => "eventKind" in item && item.eventKind === "read");
  const uniquePaths = new Set<string>();
  for (const item of readItems) {
    for (const path of item.footprint.paths) {
      uniquePaths.add(path);
    }
  }
  const latest = readItems[0];
  if (latest === undefined) {
    return "No read activity is recorded.";
  }
  return `${countText(readItems.length)} reads across ${countText(uniquePaths.size)} ${pluralize(
    uniquePaths.size,
    "path",
  )}, latest via ${latest.payload.surface}.`;
}

function summarizeGroup(
  kind: ActivityGroupKind,
  items: PersistedLocalActivityItem[],
): string {
  switch (kind) {
    case "transition":
      return summarizeTransitionGroup(items);
    case "stage":
      return summarizeStageGroup(items);
    case "continuity":
      return summarizeContinuityGroup(items);
    case "read":
      return summarizeReadGroup(items);
  }
}

function buildHeadline(
  returned: number,
  truncated: boolean,
): string {
  const headline = `Showing ${countText(returned)} recent ${pluralize(returned, "activity item")} from bounded local artifact history for the active line of work.`;
  return truncated ? `${headline} Results are truncated to the requested window.` : headline;
}

export const activityViewTool: ToolDefinition = {
  name: "activity_view",
  description:
    "Inspect recent bounded local artifact history for the active workspace, anchored to the current commit when possible.",
  schema: {
    limit: limitSchema,
  },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const limit = limitSchema.parse(args["limit"]) ?? 20;
      const workspaceStatus = ctx.getWorkspaceStatus();

      if (workspaceStatus.bindState === "unbound") {
        return ctx.respond("activity_view", {
          ...workspaceStatus,
          truthClass: "artifact_history",
          anchor: buildAnchor(false, null, null),
          summary: {
            headline: buildHeadline(0, false),
            anchor: "Anchor to the current Git commit is unavailable because no workspace is bound.",
            workspace: "No active causal workspace is available until a workspace is bound.",
            groups: [],
          },
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
          summary: summarizeGroup(groupKind, items),
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
        summary: {
          headline: buildHeadline(activityWindow.items.length, activityWindow.truncated),
          anchor: describeAnchor(anchor),
          workspace: describeWorkspace(
            repoConcurrency === null
              ? null
              : { posture: repoConcurrency.posture, summary: repoConcurrency.summary },
            repoState.semanticTransition?.summary ?? null,
            stagedTarget,
          ),
          groups: groups.map((group) => group.summary),
        },
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
