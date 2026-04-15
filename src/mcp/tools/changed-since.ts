import { z } from "zod";
import { RepoWorkspace } from "../../operations/repo-workspace.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";
import { toPolicyPath } from "../policy.js";

export const changedSinceTool: ToolDefinition = {
  name: "changed_since",
  description:
    "Check if a file changed since it was last read. Returns structural " +
    "diff (added/removed/changed symbols) or 'unchanged'. Peek mode by " +
    "default; pass consume: true to update the observation cache.",
  schema: { path: z.string(), consume: z.boolean().optional() },
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      const workspace = new RepoWorkspace({
        projectRoot: ctx.projectRoot,
        fs: ctx.fs,
        codec: ctx.codec,
        graftignorePatterns: ctx.graftignorePatterns,
        resolvePath: (input) => ctx.resolvePath(input),
        toPolicyPath: (resolvedPath) => toPolicyPath(ctx.projectRoot, resolvedPath),
        session: ctx.session,
        cache: ctx.cache,
      });
      return ctx.respond("changed_since", await workspace.changedSince({
        path: args["path"] as string,
        consume: args["consume"] as boolean | undefined,
      }));
    };
  },
};
