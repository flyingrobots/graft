import * as fs from "node:fs";
import * as path from "node:path";
import { fileOutline } from "../../operations/file-outline.js";
import { hashContent } from "../cache.js";
import type { ToolHandler, ToolContext } from "../context.js";

export const FILE_OUTLINE_DESCRIPTION =
  "Structural skeleton of a file \u2014 function signatures, class shapes, " +
  "exports. Includes a jump table mapping each symbol to its line range " +
  "for targeted read_range follow-ups.";

export function createFileOutlineHandler(ctx: ToolContext): ToolHandler {
  return async (args) => {
    const filePath = path.resolve(ctx.projectRoot, args["path"] as string);

    // Check cache
    let rawContent: string | null = null;
    try {
      rawContent = fs.readFileSync(filePath, "utf-8");
    } catch {
      // proceed to fileOutline for error handling
    }

    if (rawContent !== null) {
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

    const result = await fileOutline(filePath);
    ctx.metrics.recordOutline();

    // Record observation
    if (rawContent !== null) {
      ctx.cache.record(
        filePath,
        hashContent(rawContent),
        result.outline,
        result.jumpTable,
        { lines: rawContent.split("\n").length, bytes: Buffer.byteLength(rawContent) },
      );
    }

    return ctx.respond("file_outline", result as unknown as Record<string, unknown>);
  };
}
