import { z } from "zod";
import { safeRead } from "../../operations/safe-read.js";
import type { SafeReadResult } from "../../operations/safe-read.js";
import { RefusedResult } from "../../policy/types.js";
import { diffOutlines } from "../../parser/diff.js";
import { CachedFile } from "../cached-file.js";
import type { Metrics } from "../metrics.js";
import { evaluateMcpPolicy, toPolicyPath } from "../policy.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

const PROJECTION_METRICS: Readonly<Record<string, ((m: Metrics) => void) | undefined>> = {
  content: (m) => { m.recordRead(); },
  outline: (m) => { m.recordOutline(); },
  refused: (m) => { m.recordRefusal(); },
};

const CACHEABLE_PROJECTIONS: ReadonlySet<SafeReadResult["projection"]> = new Set(["content", "outline"]);

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
      const filePath = ctx.resolvePath(args["path"] as string);

      // Build CachedFile once — all consumers share the same snapshot,
      // eliminating TOCTOU races where the file changes between reads.
      let cf: CachedFile | null = null;
      try {
        const rawContent = ctx.fs.readFileSync(filePath, "utf-8");
        cf = new CachedFile(filePath, rawContent);
      } catch {
        // File doesn't exist or can't be read — proceed to safeRead for error handling
      }

      // Check cache if we could read the file
      if (cf?.supportsOutline === true) {
        const cacheResult = ctx.cache.check(filePath, cf.rawContent);
        if (cacheResult.hit) {
          // Defense: re-check policy before returning cached data.
          const policy = evaluateMcpPolicy(ctx, filePath, cf.actual);
          if (policy instanceof RefusedResult) {
            ctx.metrics.recordRefusal();
            return ctx.respond("safe_read", {
              path: filePath,
              projection: "refused",
              reason: policy.reason,
              reasonDetail: policy.reasonDetail,
              next: [...policy.next],
              actual: cf.actual,
            });
          }

          cacheResult.obs.touch();
          ctx.metrics.recordCacheHit(cf.actual.bytes);
          return ctx.respond("safe_read", {
            path: filePath,
            projection: "cache_hit",
            reason: "REREAD_UNCHANGED",
            outline: cacheResult.obs.outline,
            jumpTable: cacheResult.obs.jumpTable,
            actual: cf.actual,
            readCount: cacheResult.obs.readCount,
            estimatedBytesAvoided: cf.actual.bytes,
            lastReadAt: cacheResult.obs.lastReadAt,
          });
        }

        // File changed since last observation — compute structural diff
        if (cacheResult.stale !== null) {
          // Defense: re-check policy before returning structural data.
          const policy = evaluateMcpPolicy(ctx, filePath, cf.actual);
          if (policy instanceof RefusedResult) {
            ctx.metrics.recordRefusal();
            return ctx.respond("safe_read", {
              path: filePath,
              projection: "refused",
              reason: policy.reason,
              reasonDetail: policy.reasonDetail,
              next: [...policy.next],
              actual: cf.actual,
            });
          }

          const diff = diffOutlines(cacheResult.stale.outline, cf.outline);
          const newReadCount = cacheResult.stale.readCount + 1;
          ctx.cache.record(filePath, cf.hash, cf.outline, cf.jumpTable, cf.actual);
          const updatedObs = ctx.cache.get(filePath);
          return ctx.respond("safe_read", {
            path: filePath,
            projection: "diff",
            reason: "CHANGED_SINCE_LAST_READ",
            diff,
            outline: cf.outline,
            jumpTable: cf.jumpTable,
            actual: cf.actual,
            readCount: newReadCount,
            lastReadAt: updatedObs?.lastReadAt ?? new Date().toISOString(),
          });
        }
      }

      // First read — pass rawContent to avoid double-read (TOCTOU)
      const result = await safeRead(filePath, {
        fs: ctx.fs,
        codec: ctx.codec,
        content: cf?.rawContent,
        intent: args["intent"] as string | undefined,
        policyPath: toPolicyPath(ctx.projectRoot, filePath),
        graftignorePatterns: [...ctx.graftignorePatterns],
        sessionDepth: ctx.session.getSessionDepth(),
        budgetRemaining: ctx.session.getBudget()?.remaining,
      });

      PROJECTION_METRICS[result.projection]?.(ctx.metrics);

      // Record observation for cacheable projections — uses CachedFile
      // outline (no re-read) to eliminate the snapshot race.
      if (
        cf !== null &&
        cf.supportsOutline &&
        result.actual !== undefined &&
        CACHEABLE_PROJECTIONS.has(result.projection) &&
        result.reason !== "UNSUPPORTED_LANGUAGE"
      ) {
        ctx.cache.record(filePath, cf.hash, cf.outline, cf.jumpTable, result.actual);
      }

      return ctx.respond("safe_read", result);
    };
  },
};
