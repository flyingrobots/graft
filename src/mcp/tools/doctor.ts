import type { ToolHandler, ToolContext } from "../context.js";

export function createDoctorHandler(ctx: ToolContext): ToolHandler {
  return () => {
    return Promise.resolve(ctx.respond("doctor", {
      projectRoot: ctx.projectRoot,
      parserHealthy: true,
      thresholds: { lines: 150, bytes: 12288 },
      sessionDepth: ctx.session.getSessionDepth(),
      totalMessages: ctx.session.getMessageCount(),
    }));
  };
}
