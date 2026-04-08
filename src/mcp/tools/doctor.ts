import { STATIC_THRESHOLDS } from "../../policy/evaluate.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

export const doctorTool: ToolDefinition = {
  name: "doctor",
  description:
    "Runtime health check. Shows project root, parser status, active " +
    "thresholds, session depth, and message count.",
  createHandler(ctx: ToolContext): ToolHandler {
    return () => {
      const repoState = ctx.getRepoState();
      return ctx.respond("doctor", {
        projectRoot: ctx.projectRoot,
        parserHealthy: true,
        thresholds: { lines: STATIC_THRESHOLDS.lines, bytes: STATIC_THRESHOLDS.bytes },
        sessionDepth: ctx.session.getSessionDepth(),
        totalMessages: ctx.session.getMessageCount(),
        runtimeObservability: ctx.observability,
        checkoutEpoch: repoState.checkoutEpoch,
        lastTransition: repoState.lastTransition,
        workspaceOverlay: repoState.workspaceOverlay,
      });
    };
  },
};
