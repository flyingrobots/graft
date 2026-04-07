import { z } from "zod";
import { graftDiff } from "../../operations/graft-diff.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";
import { evaluateMcpRefusal } from "../policy.js";

export const sinceTool: ToolDefinition = {
  name: "graft_since",
  description:
    "Structural changes since a git ref. Shows symbols added, removed, " +
    "and changed per file — not line hunks. Includes per-file summary " +
    "lines for quick triage. Defaults to HEAD as the comparison target.",
  schema: {
    base: z.string(),
    head: z.string().optional(),
  },
  createHandler(ctx: ToolContext): ToolHandler {
    return (args) => {
      const base = args["base"] as string;
      const head = (args["head"] as string | undefined) ?? "HEAD";

      const result = graftDiff({
        cwd: ctx.projectRoot,
        fs: ctx.fs,
        base,
        head,
        refusalCheck: (filePath, actual) => evaluateMcpRefusal(ctx, filePath, actual),
      });

      // Aggregate symbol-level changes across all files
      let totalAdded = 0;
      let totalRemoved = 0;
      let totalChanged = 0;

      for (const file of result.files) {
        totalAdded += file.diff.added.length;
        totalRemoved += file.diff.removed.length;
        totalChanged += file.diff.changed.length;
      }

      return ctx.respond("graft_since", {
        ...result,
        summary: `+${String(totalAdded)} added, -${String(totalRemoved)} removed, ~${String(totalChanged)} changed across ${String(result.files.length)} files`,
        layer: "ref_view",
      });
    };
  },
};
