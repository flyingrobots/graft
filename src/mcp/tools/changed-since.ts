import { z } from "zod";
import { evaluatePolicy } from "../../policy/evaluate.js";
import { RefusedResult } from "../../policy/types.js";
import { extractOutline } from "../../parser/outline.js";
import { diffOutlines } from "../../parser/diff.js";
import { detectLang } from "../../parser/lang.js";
import { hashContent } from "../cache.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

export const changedSinceTool: ToolDefinition = {
  name: "changed_since",
  description:
    "Check if a file changed since it was last read. Returns structural " +
    "diff (added/removed/changed symbols) or 'unchanged'. Peek mode by " +
    "default; pass consume: true to update the observation cache.",
  schema: { path: z.string(), consume: z.boolean().optional() },
  createHandler(ctx: ToolContext): ToolHandler {
    return (args) => {
      const filePath = ctx.resolvePath(args["path"] as string);
      const consume = (args["consume"] as boolean | undefined) === true;

      // Policy check: refuse banned files even via changed_since.
      // Read the file first to get dimensions for policy evaluation.
      let rawContent: string;
      try {
        rawContent = ctx.fs.readFileSync(filePath, "utf-8");
      } catch {
        return ctx.respond("changed_since", { status: "file_not_found" });
      }

      const actual = {
        lines: rawContent.split("\n").length,
        bytes: Buffer.byteLength(rawContent),
      };
      const policy = evaluatePolicy(
        { path: filePath, lines: actual.lines, bytes: actual.bytes },
        { sessionDepth: ctx.session.getSessionDepth() },
      );
      if (policy instanceof RefusedResult) {
        return ctx.respond("changed_since", { status: "refused", reason: policy.reason });
      }

      const cacheResult = ctx.cache.check(filePath, rawContent);
      if (cacheResult.hit) {
        return ctx.respond("changed_since", { status: "unchanged" });
      }
      if (cacheResult.stale === null) {
        return ctx.respond("changed_since", { status: "no_previous_observation" });
      }

      // Use extractOutline with rawContent directly to avoid snapshot race.
      const newOutlineResult = extractOutline(rawContent, detectLang(filePath) ?? "ts");
      const diff = diffOutlines(cacheResult.stale.outline, newOutlineResult.entries);

      if (consume) {
        ctx.cache.record(
          filePath,
          hashContent(rawContent),
          newOutlineResult.entries,
          newOutlineResult.jumpTable ?? [],
          actual,
        );
      }

      return ctx.respond("changed_since", { diff, consumed: consume });
    };
  },
};
