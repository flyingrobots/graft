import { z } from "zod";
import type { ToolDefinition, ToolHandler } from "../context.js";

export const workspaceRebindTool: ToolDefinition = {
  name: "workspace_rebind",
  description:
    "Rebind the current daemon session to a different workspace and start a fresh session-local slice.",
  schema: {
    cwd: z.string(),
    worktreeRoot: z.string().optional(),
    gitCommonDir: z.string().optional(),
    repoId: z.string().optional(),
  },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const result = await ctx.rebindWorkspace({
        cwd: args["cwd"] as string,
        worktreeRoot: args["worktreeRoot"] as string | undefined,
        gitCommonDir: args["gitCommonDir"] as string | undefined,
        repoId: args["repoId"] as string | undefined,
      }, "workspace_rebind");
      return ctx.respond("workspace_rebind", { ...result });
    };
  },
};
