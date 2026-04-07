import { z } from "zod";
import { graftDiff } from "../../operations/graft-diff.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";
import { evaluateMcpRefusal } from "../policy.js";

export const graftDiffTool: ToolDefinition = {
  name: "graft_diff",
  description:
    "Structural diff between two git refs. Shows added, removed, and " +
    "changed symbols per file \u2014 not line hunks. Defaults to working " +
    "tree vs HEAD.",
  schema: { base: z.string().optional(), head: z.string().optional(), path: z.string().optional() },
  createHandler(ctx: ToolContext): ToolHandler {
    return (args) => {
      const head = args["head"] as string | undefined;
      const result = graftDiff({
        cwd: ctx.projectRoot,
        fs: ctx.fs,
        base: args["base"] as string | undefined,
        head,
        path: args["path"] as string | undefined,
        refusalCheck: (filePath, actual) => evaluateMcpRefusal(ctx, filePath, actual),
      });
      return ctx.respond("graft_diff", {
        ...result,
        layer: head === undefined ? "workspace_overlay" : "ref_view",
      });
    };
  },
};
