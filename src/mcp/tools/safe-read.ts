import { z } from "zod";
import { RepoWorkspace } from "../../operations/repo-workspace.js";
import type { Metrics } from "../metrics.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";
import { toPolicyPath } from "../policy.js";

const PROJECTION_METRICS: Readonly<Record<string, ((m: Metrics) => void) | undefined>> = {
  content: (m) => { m.recordRead(); },
  outline: (m) => { m.recordOutline(); },
  diff: (m) => { m.recordOutline(); },
  refused: (m) => { m.recordRefusal(); },
};

export const safeReadTool: ToolDefinition = {
  name: "safe_read",
  description:
    "Policy-enforced file read. Returns full content for small files, " +
    "structural outline with jump table for large files, or refusal with " +
    "reason code for banned files. Detects re-reads and returns cached " +
    "outlines or structural diffs.",
  schema: { path: z.string(), intent: z.string().optional() },
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      const workspace = new RepoWorkspace({
        projectRoot: ctx.projectRoot,
        fs: ctx.fs,
        codec: ctx.codec,
        graftignorePatterns: ctx.graftignorePatterns,
        resolvePath: (input) => ctx.resolvePath(input),
        toPolicyPath: (resolvedPath) => toPolicyPath(ctx.projectRoot, resolvedPath),
        session: ctx.session,
        cache: ctx.cache,
      });
      const result = await workspace.safeRead({
        path: args["path"] as string,
        intent: args["intent"] as string | undefined,
      });

      PROJECTION_METRICS[result.projection]?.(ctx.metrics);
      if (result.projection === "cache_hit") {
        ctx.metrics.recordCacheHit(result.actual.bytes);
      }

      return ctx.respond("safe_read", result);
    };
  },
};
