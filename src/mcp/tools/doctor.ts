import { STATIC_THRESHOLDS } from "../../policy/evaluate.js";
import { topBurdenKind, totalNonReadBytesReturned } from "../burden.js";
import { buildRuntimeStagedTarget } from "../runtime-staged-target.js";
import { deriveCausalSurfaceNextAction } from "../semantic-transition-guidance.js";
import type { ToolDefinition, ToolHandler } from "../context.js";
import { toJsonObject } from "../../operations/result-dto.js";
import type {
  DiagnosticEvidenceGap,
  DoctorFullResponse,
  DoctorSummaryResponse,
} from "./diagnostic-models.js";
import { detectSludge } from "../../operations/sludge-detector.js";
import type { PersistedLocalHistorySummary, RepoConcurrencySummary } from "../persisted-local-history.js";
import type { WorkspaceStatus } from "../workspace-router.js";
import { diagnosticDetailSchema, readDiagnosticDetail } from "./diagnostic-detail.js";
import { z } from "zod";

function workspaceSummary(status: WorkspaceStatus): DoctorSummaryResponse["workspace"] {
  return {
    sessionMode: status.sessionMode,
    bindState: status.bindState,
    repoId: status.repoId,
    worktreeId: status.worktreeId,
  };
}

function localHistorySummary(
  status: WorkspaceStatus,
  history: PersistedLocalHistorySummary,
): DoctorSummaryResponse["history"]["local"] {
  if (status.bindState === "unbound") {
    return { readiness: "unavailable", active: false };
  }
  if (history.availability === "none") {
    return { readiness: "ready", active: false };
  }
  return history.active
    ? { readiness: "ready", active: true }
    : { readiness: "degraded", active: false };
}

function concurrencyGap(
  concurrency: RepoConcurrencySummary | null,
): DiagnosticEvidenceGap | null {
  switch (concurrency?.posture) {
    case undefined:
    case "unknown":
      return "repo_concurrency_unknown";
    case "exclusive":
      return null;
    case "shared_repo_only":
    case "shared_worktree":
    case "overlapping_actors":
    case "divergent_checkout":
      return concurrency.posture;
  }
}

export const doctorTool: ToolDefinition = {
  name: "doctor",
  description:
    "Return bounded runtime health, workspace, history-readiness, evidence-gap, " +
    "and next-action guidance. Request detail='full' for exhaustive evidence.",
  schema: {
    sludge: z.boolean().optional(),
    path: z.string().optional(),
    detail: diagnosticDetailSchema,
  },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const pathArg = typeof args["path"] === "string" ? args["path"] : undefined;
      const sludgeRequested = args["sludge"] === true;
      const detail = readDiagnosticDetail(args, sludgeRequested);
      const sludge = sludgeRequested
        ? await detectSludge({
          cwd: ctx.projectRoot,
          fs: ctx.fs,
          git: ctx.git,
          resolvePath: (filePath) => ctx.resolvePath(filePath),
          ...(pathArg !== undefined ? { path: pathArg } : {}),
        })
        : undefined;
      const repoState = ctx.getRepoState();
      const status = ctx.getWorkspaceStatus();
      const workspaceOverlayFooting = await ctx.getWorkspaceOverlayFooting();
      const persistedLocalHistory = await ctx.getPersistedLocalHistorySummary();
      const repoConcurrency = await ctx.getRepoConcurrencySummary();
      const recommendedNextAction = deriveCausalSurfaceNextAction(
        persistedLocalHistory.nextAction,
        repoState.semanticTransition,
        repoConcurrency,
      );

      if (detail === "summary") {
        const localHistory = localHistorySummary(status, persistedLocalHistory);
        const repoConcurrencyGap = concurrencyGap(repoConcurrency);
        const degradedReasons: DiagnosticEvidenceGap[] = [
          "structural_history_readiness_unknown",
          ...(status.bindState === "unbound" ? ["workspace_unbound" as const] : []),
          ...(localHistory.readiness === "unavailable"
            ? ["local_history_unavailable" as const]
            : localHistory.readiness === "degraded"
              ? ["local_history_inactive" as const]
              : []),
          ...(workspaceOverlayFooting === null
            ? []
            : [workspaceOverlayFooting.degradedReason]),
          ...(repoConcurrencyGap === null
            ? []
            : [repoConcurrencyGap]),
        ];
        const response: DoctorSummaryResponse = {
          health: degradedReasons.length === 0 ? "healthy" : "degraded",
          workspace: workspaceSummary(status),
          history: {
            structural: {
              readiness: "unknown",
              reason: "not_observed",
            },
            local: localHistory,
          },
          degradedReasons: [...new Set(degradedReasons)],
          recommendedNextAction,
        };
        return ctx.respond("doctor", toJsonObject(response));
      }

      const causalContext = ctx.getCausalContext();
      const metrics = ctx.metrics.snapshot();
      const topBurden = topBurdenKind(metrics.burdenByKind);
      const response: DoctorFullResponse = {
        projectRoot: ctx.projectRoot,
        parserHealthy: true,
        thresholds: { lines: STATIC_THRESHOLDS.lines, bytes: STATIC_THRESHOLDS.bytes },
        sessionDepth: ctx.governor.getGovernorDepth(),
        totalMessages: ctx.governor.getMessageCount(),
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
        repoConcurrency,
        checkoutEpoch: repoState.checkoutEpoch,
        lastTransition: repoState.lastTransition,
        semanticTransition: repoState.semanticTransition,
        workspaceOverlayId: repoState.workspaceOverlayId,
        workspaceOverlay: repoState.workspaceOverlay,
        workspaceOverlayFooting,
        stagedTarget: buildRuntimeStagedTarget(
          status,
          causalContext,
          repoState,
          persistedLocalHistory.attribution,
        ),
        attribution: persistedLocalHistory.attribution,
        persistedLocalHistory,
        recommendedNextAction,
        ...(sludge !== undefined ? { sludge } : {}),
      };
      return ctx.respond("doctor", toJsonObject(response));
    };
  },
};
