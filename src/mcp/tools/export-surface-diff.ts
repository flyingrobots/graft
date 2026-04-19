import { z } from "zod";
import { exportSurfaceDiff, exportSurfaceDiffToJson } from "../../operations/export-surface-diff.js";
import type { ToolDefinition, ToolHandler } from "../context.js";

export const exportSurfaceDiffTool: ToolDefinition = {
  name: "graft_exports",
  description:
    "Export surface diff — what changed in the public API between two " +
    "refs? Identifies added, removed, and signature-changed exported " +
    "symbols and derives semver impact.",
  schema: {
    base: z.string().optional(),
    head: z.string().optional(),
  },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const result = await exportSurfaceDiff({
        cwd: ctx.projectRoot,
        git: ctx.git,
        base: args["base"] as string | undefined,
        head: args["head"] as string | undefined,
      });
      return ctx.respond("graft_exports", exportSurfaceDiffToJson(result));
    };
  },
};
