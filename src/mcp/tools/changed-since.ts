import { z } from "zod";
import { createColorfulCliProseProjector } from "../../adapters/colorful-cli-prose-projector.js";
import { RefusedResult } from "../../policy/types.js";
import { detectStructuredFormat } from "../../parser/lang.js";
import { diffOutlines } from "../../parser/diff.js";
import { extractOutlineProjectionForContent } from "../../operations/file-outline.js";
import { hashContent } from "../cache.js";
import type { ToolDefinition, ToolHandler } from "../context.js";
import { evaluateMcpPolicy } from "../policy.js";

export const changedSinceTool: ToolDefinition = {
  name: "changed_since",
  description:
    "Check if a file changed since it was last read. Returns structural " +
    "diff (added/removed/changed symbols) or 'unchanged'. Peek mode by " +
    "default; pass consume: true to update the observation cache.",
  schema: { path: z.string(), consume: z.boolean().optional() },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const filePath = ctx.resolvePath(args["path"] as string);
      ctx.recordFootprint({ paths: [filePath] });
      const consume = (args["consume"] as boolean | undefined) === true;

      // Policy check: refuse banned files even via changed_since.
      // Read the file first to get dimensions for policy evaluation.
      let rawContent: string;
      try {
        rawContent = await ctx.fs.readFile(filePath, "utf-8");
      } catch {
        return ctx.respond("changed_since", { status: "file_not_found" });
      }

      const actual = {
        lines: rawContent.split("\n").length,
        bytes: Buffer.byteLength(rawContent),
      };
      const policy = evaluateMcpPolicy(ctx, filePath, actual);
      if (policy instanceof RefusedResult) {
        return ctx.respond("changed_since", { status: "refused", reason: policy.reason });
      }

      const cacheResult = ctx.cache.check(filePath, rawContent);
      if (cacheResult.hit) {
        return ctx.respond("changed_since", { status: "unchanged" });
      }
      if (cacheResult.stale === null) {
        if (detectStructuredFormat(filePath) === null) {
          const outline = await extractOutlineProjectionForContent(filePath, rawContent, {
            proseProjector: createColorfulCliProseProjector({
              processRunner: ctx.process,
              cwd: ctx.projectRoot,
            }),
          });
          if (outline === null) {
            return ctx.respond("changed_since", {
              status: "unsupported",
              reason: "UNSUPPORTED_LANGUAGE",
            });
          }
        }
        return ctx.respond("changed_since", { status: "no_previous_observation" });
      }

      const newOutlineResult = await extractOutlineProjectionForContent(filePath, rawContent, {
        proseProjector: createColorfulCliProseProjector({
          processRunner: ctx.process,
          cwd: ctx.projectRoot,
        }),
      });
      if (newOutlineResult === null) {
        return ctx.respond("changed_since", {
          status: "unsupported",
          reason: "UNSUPPORTED_LANGUAGE",
        });
      }

      const diff = diffOutlines(cacheResult.stale.outline, newOutlineResult.outline);

      if (consume) {
        ctx.cache.record(
          filePath,
          hashContent(rawContent),
          newOutlineResult.outline,
          newOutlineResult.jumpTable,
          actual,
        );
      }

      return ctx.respond("changed_since", { diff, consumed: consume });
    };
  },
};
