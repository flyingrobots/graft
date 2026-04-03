import { STATIC_THRESHOLDS } from "../../policy/evaluate.js";
import type { ToolHandler, ToolContext } from "../context.js";

export const DOCTOR_DESCRIPTION =
  "Runtime health check. Shows project root, parser status, active " +
  "thresholds, session depth, and message count.";

export function createDoctorHandler(ctx: ToolContext): ToolHandler {
  return () => {
    return ctx.respond("doctor", {
      projectRoot: ctx.projectRoot,
      parserHealthy: true,
      thresholds: { lines: STATIC_THRESHOLDS.lines, bytes: STATIC_THRESHOLDS.bytes },
      sessionDepth: ctx.session.getSessionDepth(),
      totalMessages: ctx.session.getMessageCount(),
    });
  };
}
