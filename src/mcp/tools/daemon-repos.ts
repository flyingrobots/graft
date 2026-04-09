import { z } from "zod";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

export const daemonReposTool: ToolDefinition = {
  name: "daemon_repos",
  description:
    "List authorized canonical repos with bounded worktree, session, backlog, and monitor summary for daemon-wide inspection.",
  schema: {
    repoId: z.string().optional(),
    cwd: z.string().optional(),
  },
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      return ctx.respond("daemon_repos", {
        ...await ctx.listDaemonRepos({
          repoId: args["repoId"] as string | undefined,
          cwd: args["cwd"] as string | undefined,
        }),
      });
    };
  },
};
