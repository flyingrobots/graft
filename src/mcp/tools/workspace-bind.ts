import { z } from "zod";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

export const workspaceBindTool: ToolDefinition = {
  name: "workspace_bind",
  description:
    "Bind the current daemon session to a workspace by resolving repo and worktree identity server-side.",
  schema: {
    cwd: z.string(),
    worktreeRoot: z.string().optional(),
    gitCommonDir: z.string().optional(),
    repoId: z.string().optional(),
  },
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      const result = await ctx.bindWorkspace({
        cwd: args["cwd"] as string,
        worktreeRoot: args["worktreeRoot"] as string | undefined,
        gitCommonDir: args["gitCommonDir"] as string | undefined,
        repoId: args["repoId"] as string | undefined,
      }, "workspace_bind");
      return ctx.respond("workspace_bind", { ...result });
    };
  },
};
