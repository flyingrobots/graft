import { z } from "zod";
import type { RepoWorkspaceSafeReadResult } from "../../operations/repo-workspace.js";
import { toJsonObject } from "../../operations/result-dto.js";
import type { Metrics } from "../metrics.js";
import type { ToolDefinition, ToolHandler } from "../context.js";
import { createRepoWorkspaceFromToolContext } from "../repo-workspace.js";

const PROJECTION_METRICS: Readonly<Record<string, ((m: Metrics, result: RepoWorkspaceSafeReadResult) => void) | undefined>> = {
  content: (m) => { m.recordRead(); },
  outline: (m) => { m.recordOutline(); },
  refused: (m) => { m.recordRefusal(); },
  cache_hit: (m, result) => {
    if (result.projection === "cache_hit") {
      m.recordCacheHit(result.estimatedBytesAvoided);
    }
  },
};

export const safeReadTool: ToolDefinition = {
  name: "safe_read",
  description:
    "Policy-enforced file read. Returns full content for small files, " +
    "structural outline with jump table for large files, or refusal with " +
    "reason code for banned files. Detects re-reads and returns cached " +
    "outlines or structural diffs.",
  schema: { path: z.string(), intent: z.string().optional() },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const filePath = ctx.resolvePath(args["path"] as string);
      ctx.recordFootprint({ paths: [filePath] });

      const workspace = createRepoWorkspaceFromToolContext(ctx);
      const result = await workspace.safeRead({
        path: args["path"] as string,
        intent: args["intent"] as string | undefined,
      });

      PROJECTION_METRICS[result.projection]?.(ctx.metrics, result);
      if (result.outline !== undefined) {
        ctx.recordFootprint({ symbols: result.outline.map((e) => e.name) });
      }

      return ctx.respond("safe_read", toJsonObject(result));
    };
  },
};
