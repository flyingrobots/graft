import * as fs from "node:fs";
import { evaluatePolicy } from "../../policy/evaluate.js";
import { RefusedResult } from "../../policy/types.js";
import { extractOutline } from "../../parser/outline.js";
import { diffOutlines } from "../../parser/diff.js";
import { detectLang } from "../../parser/lang.js";
import { hashContent } from "../cache.js";
import type { ToolHandler, ToolContext } from "../context.js";

export const CHANGED_SINCE_DESCRIPTION =
  "Check if a file changed since it was last read. Returns structural " +
  "diff (added/removed/changed symbols) or 'unchanged'. Peek mode by " +
  "default; pass consume: true to update the observation cache.";

export function createChangedSinceHandler(ctx: ToolContext): ToolHandler {
  return (args) => {
    const filePath = ctx.resolvePath(args["path"] as string);
    const consume = (args["consume"] as boolean | undefined) === true;

    // Policy check: refuse banned files even via changed_since.
    // Read the file first to get dimensions for policy evaluation.
    let rawContent: string;
    try {
      rawContent = fs.readFileSync(filePath, "utf-8");
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

    const obs = ctx.cache.get(filePath);
    if (obs === undefined) {
      return ctx.respond("changed_since", { status: "no_previous_observation" });
    }

    const currentHash = hashContent(rawContent);
    if (obs.contentHash === currentHash) {
      return ctx.respond("changed_since", { status: "unchanged" });
    }

    // Use extractOutline with rawContent directly to avoid snapshot race.
    const newOutlineResult = extractOutline(rawContent, detectLang(filePath) ?? "ts");
    const diff = diffOutlines(obs.outline, newOutlineResult.entries);

    if (consume) {
      ctx.cache.record(
        filePath,
        currentHash,
        newOutlineResult.entries,
        newOutlineResult.jumpTable ?? [],
        actual,
      );
    }

    return ctx.respond("changed_since", { diff, consumed: consume });
  };
}
