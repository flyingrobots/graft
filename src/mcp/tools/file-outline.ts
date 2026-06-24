import { z } from "zod";
import { createColorfulCliProseProjector } from "../../adapters/colorful-cli-prose-projector.js";
import { fileOutline } from "../../operations/file-outline.js";
import { hashContent } from "../cache.js";
import type { ToolDefinition, ToolHandler } from "../context.js";
import { toJsonObject } from "../../operations/result-dto.js";

export const fileOutlineTool: ToolDefinition = {
  name: "file_outline",
  description:
    "Structural skeleton of a file \u2014 function signatures, class shapes, " +
    "exports. Includes a jump table mapping each symbol to its line range " +
    "for targeted read_range follow-ups.",
  schema: { path: z.string() },
  policyCheck: true,
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const filePath = ctx.resolvePath(args["path"] as string);
      ctx.recordFootprint({ paths: [filePath] });

      // Check cache
      let rawContent: string | null = null;
      try {
        rawContent = await ctx.fs.readFile(filePath, "utf-8");
      } catch {
        // proceed to fileOutline for error handling
      }

      if (rawContent !== null) {
        const cacheResult = ctx.cache.check(filePath, rawContent);
        if (cacheResult.hit) {
          cacheResult.obs.touch(ctx.cache.now());
          ctx.metrics.recordCacheHit(cacheResult.obs.actual.bytes);
          ctx.recordFootprint({
            symbols: cacheResult.obs.outline.map((e) => e.name),
          });
          return ctx.respond("file_outline", {
            path: filePath,
            outline: cacheResult.obs.outline,
            jumpTable: cacheResult.obs.jumpTable,
            cacheHit: true,
          });
        }
        // If stale, fall through to fresh parse (no diff for file_outline)
      }

      const result = await fileOutline(filePath, {
        fs: ctx.fs,
        proseProjector: createColorfulCliProseProjector({
          processRunner: ctx.process,
          cwd: ctx.projectRoot,
        }),
      });
      ctx.metrics.recordOutline();
      ctx.recordFootprint({ symbols: result.outline.map((e) => e.name) });

      // Record observation
      if (rawContent !== null && result.reason !== "UNSUPPORTED_LANGUAGE") {
        ctx.cache.record(
          filePath,
          hashContent(rawContent),
          result.outline,
          result.jumpTable,
          { lines: rawContent.split("\n").length, bytes: Buffer.byteLength(rawContent) },
        );
      }

      return ctx.respond("file_outline", toJsonObject(result));
    };
  },
};
