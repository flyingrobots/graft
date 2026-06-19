import { z } from "zod";
import type { ToolDefinition, ToolHandler } from "../context.js";

export const workspaceRebindTool: ToolDefinition = {
  name: "workspace_rebind",
  description:
    "Rebind the current daemon session to a different workspace and start a fresh session-local slice. Pass authorize: true to explicitly authorize and rebind in one call.",
  schema: {
    cwd: z.string(),
    worktreeRoot: z.string().optional(),
    gitCommonDir: z.string().optional(),
    repoId: z.string().optional(),
    authorize: z.boolean().optional(),
    runCapture: z.boolean().optional(),
  },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const request = {
        cwd: args["cwd"] as string,
        worktreeRoot: args["worktreeRoot"] as string | undefined,
        gitCommonDir: args["gitCommonDir"] as string | undefined,
        repoId: args["repoId"] as string | undefined,
      };
      const authorize = args["authorize"] === true;
      let authorizationChanged: boolean | undefined;

      if (authorize) {
        const authorization = await ctx.authorizeWorkspace({
          cwd: request.cwd,
          runCapture: args["runCapture"] as boolean | undefined,
        });
        if (!authorization.ok) {
          return ctx.respond("workspace_rebind", {
            ok: false,
            action: "rebind",
            freshSessionSlice: false,
            ...ctx.getWorkspaceStatus(),
            errorCode: authorization.errorCode,
            error: authorization.error,
          });
        }
        authorizationChanged = authorization.changed;
      }

      const result = await ctx.rebindWorkspace({
        ...request,
      }, "workspace_rebind");
      return ctx.respond("workspace_rebind", {
        ...result,
        ...(authorize ? { authorized: true, authorizationChanged } : {}),
      });
    };
  },
};
