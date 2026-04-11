import { z } from "zod";
import { fileOutline } from "../../operations/file-outline.js";
import { detectStructuredFormat } from "../../parser/lang.js";
import { hashContent } from "../cache.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

export const fileOutlineTool: ToolDefinition = {
  name: "file_outline",
  description:
    "Structural skeleton of a file \u2014 function signatures, class shapes, " +
    "exports. Includes a jump table mapping each symbol to its line range " +
    "for targeted read_range follow-ups.",
  schema: { path: z.string() },
  policyCheck: true,
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      const filePath = ctx.resolvePath(args["path"] as string);

      // Check cache
      let rawContent: string | null = null;
      try {
        rawContent = await ctx.fs.readFile(filePath, "utf-8");
      } catch {
        // proceed to fileOutline for error handling
      }

      const outlineSupported = detectStructuredFormat(filePath) !== null;

      if (rawContent !== null && outlineSupported) {
        const cacheResult = ctx.cache.check(filePath, rawContent);
        if (cacheResult.hit) {
          cacheResult.obs.touch();
          ctx.metrics.recordCacheHit(cacheResult.obs.actual.bytes);
          return ctx.respond("file_outline", {
            path: filePath,
            outline: cacheResult.obs.outline,
            jumpTable: cacheResult.obs.jumpTable,
            cacheHit: true,
          });
        }
        // If stale, fall through to fresh parse (no diff for file_outline)
      }

      const result = await fileOutline(filePath, { fs: ctx.fs });
      ctx.metrics.recordOutline();

      // Record observation
      if (rawContent !== null && outlineSupported && result.reason !== "UNSUPPORTED_LANGUAGE") {
        ctx.cache.record(
          filePath,
          hashContent(rawContent),
          result.outline,
          result.jumpTable,
          { lines: rawContent.split("\n").length, bytes: Buffer.byteLength(rawContent) },
        );
      }

      return ctx.respond("file_outline", result);
    };
  },
};
