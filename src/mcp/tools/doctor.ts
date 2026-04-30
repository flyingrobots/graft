import { STATIC_THRESHOLDS } from "../../policy/evaluate.js";
import { topBurdenKind, totalNonReadBytesReturned } from "../burden.js";
import { buildRuntimeStagedTarget } from "../runtime-staged-target.js";
import { deriveCausalSurfaceNextAction } from "../semantic-transition-guidance.js";
import type { ToolDefinition, ToolHandler } from "../context.js";
import { toJsonObject } from "../../operations/result-dto.js";
import type { DoctorResponse } from "./diagnostic-models.js";
import { detectSludge } from "../../operations/sludge-detector.js";
import { z } from "zod";

export const doctorTool: ToolDefinition = {
  name: "doctor",
  description:
    "Runtime health check. Shows project root, parser status, active " +
    "thresholds, session depth, message count, and burden summary.",
  schema: {
    sludge: z.boolean().optional(),
    path: z.string().optional(),
  },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const pathArg = typeof args["path"] === "string" ? args["path"] : undefined;
      const sludge = args["sludge"] === true
        ? await detectSludge({
          cwd: ctx.projectRoot,
          fs: ctx.fs,
          git: ctx.git,
          resolvePath: (filePath) => ctx.resolvePath(filePath),
          ...(pathArg !== undefined ? { path: pathArg } : {}),
        })
        : undefined;
      const repoState = ctx.getRepoState();
      const causalContext = ctx.getCausalContext();
      const workspaceOverlayFooting = await ctx.getWorkspaceOverlayFooting();
      const metrics = ctx.metrics.snapshot();
      const topBurden = topBurdenKind(metrics.burdenByKind);
      const persistedLocalHistory = await ctx.getPersistedLocalHistorySummary();
      const repoConcurrency = await ctx.getRepoConcurrencySummary();
      const recommendedNextAction = deriveCausalSurfaceNextAction(
        persistedLocalHistory.nextAction,
        repoState.semanticTransition,
        repoConcurrency,
      );
      const response: DoctorResponse = {
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
          ctx.getWorkspaceStatus(),
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
