import { z } from "zod";
import { safeRead } from "../../operations/safe-read.js";
import type { SafeReadResult } from "../../operations/safe-read.js";
import { fileOutline } from "../../operations/file-outline.js";
import { evaluatePolicy } from "../../policy/evaluate.js";
import { RefusedResult } from "../../policy/types.js";
import { extractOutline } from "../../parser/outline.js";
import { diffOutlines } from "../../parser/diff.js";
import { detectLang } from "../../parser/lang.js";
import { hashContent } from "../cache.js";
import type { Metrics } from "../metrics.js";
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

      // readFileSync is intentional for TOCTOU prevention: the same content
      // must be used for cache check, policy evaluation, and outline extraction.
      // An async read could yield different content if the file changes between await points.
      let rawContent: string | null = null;
      try {
        rawContent = ctx.fs.readFileSync(filePath, "utf-8");
      } catch {
        // File doesn't exist or can't be read — proceed to safeRead for error handling
      }

      // Check cache if we could read the file
      if (rawContent !== null) {
        const cacheResult = ctx.cache.check(filePath, rawContent);
        if (cacheResult.hit) {
          // Defense: re-check policy before returning cached data.
          // A previously-allowed file may now be refused (e.g., path banned).
          const actual = cacheResult.obs.actual;
          const policy = evaluatePolicy(
            { path: filePath, lines: actual.lines, bytes: actual.bytes },
            { sessionDepth: ctx.session.getSessionDepth() },
          );
          if (policy instanceof RefusedResult) {
            ctx.metrics.recordRefusal();
            return ctx.respond("safe_read", {
              path: filePath,
              projection: "refused",
              reason: policy.reason,
              reasonDetail: policy.reasonDetail,
              next: [...policy.next],
              actual,
            });
          }

          cacheResult.obs.touch();
          ctx.metrics.recordCacheHit(actual.bytes);
          return ctx.respond("safe_read", {
            path: filePath,
            projection: "cache_hit",
            reason: "REREAD_UNCHANGED",
            outline: cacheResult.obs.outline,
            jumpTable: cacheResult.obs.jumpTable,
            actual,
            readCount: cacheResult.obs.readCount,
            estimatedBytesAvoided: actual.bytes,
            lastReadAt: cacheResult.obs.lastReadAt,
          });
        }

        // File changed since last observation — compute structural diff
        if (cacheResult.stale !== null) {
          // Defense: re-check policy before returning structural data.
          // If the file should now be refused (e.g., path became banned),
          // return the refusal instead of a diff.
          const actual = {
            lines: rawContent.split("\n").length,
            bytes: Buffer.byteLength(rawContent),
          };
          const policy = evaluatePolicy(
            { path: filePath, lines: actual.lines, bytes: actual.bytes },
            { sessionDepth: ctx.session.getSessionDepth() },
          );
          if (policy instanceof RefusedResult) {
            ctx.metrics.recordRefusal();
            return ctx.respond("safe_read", {
              path: filePath,
              projection: "refused",
              reason: policy.reason,
              reasonDetail: policy.reasonDetail,
              next: [...policy.next],
              actual,
            });
          }

          // Use extractOutline with rawContent directly to avoid snapshot race —
          // fileOutline re-reads the file, which could differ from rawContent.
          const newOutlineResult = extractOutline(rawContent, detectLang(filePath) ?? "ts");
          const diff = diffOutlines(cacheResult.stale.outline, newOutlineResult.entries);
          const newReadCount = cacheResult.stale.readCount + 1;
          // Update observation cache with new state
          ctx.cache.record(
            filePath,
            hashContent(rawContent),
            newOutlineResult.entries,
            newOutlineResult.jumpTable ?? [],
            actual,
          );
          // Use the updated observation's lastReadAt (set by cache.record)
          const updatedObs = ctx.cache.get(filePath);
          return ctx.respond("safe_read", {
            path: filePath,
            projection: "diff",
            reason: "CHANGED_SINCE_LAST_READ",
            diff,
            outline: newOutlineResult.entries,
            jumpTable: newOutlineResult.jumpTable ?? [],
            actual,
            readCount: newReadCount,
            lastReadAt: updatedObs?.lastReadAt ?? new Date().toISOString(),
          });
        }
      }

      // First read — pass rawContent to avoid double-read (TOCTOU)
      const result = await safeRead(filePath, {
        fs: ctx.fs,
        codec: ctx.codec,
        content: rawContent ?? undefined,
        intent: args["intent"] as string | undefined,
        sessionDepth: ctx.session.getSessionDepth(),
      });

      PROJECTION_METRICS[result.projection]?.(ctx.metrics);

      // Record observation for cacheable projections (not refusals/errors)
      if (rawContent !== null && result.actual !== undefined && CACHEABLE_PROJECTIONS.has(result.projection)) {
        const outlineResult = await fileOutline(filePath, { fs: ctx.fs });
        ctx.cache.record(
          filePath,
          hashContent(rawContent),
          outlineResult.outline,
          outlineResult.jumpTable,
          result.actual,
        );
      }

      return ctx.respond("safe_read", result);
    };
  },
};
