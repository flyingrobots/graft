import { z } from "zod";
import { RepoWorkspace } from "../../operations/repo-workspace.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";
import { toPolicyPath } from "../policy.js";

export const readRangeTool: ToolDefinition = {
  name: "read_range",
  description:
    "Read a bounded range of lines from a file. Maximum 250 lines. " +
    "Use jump table entries from file_outline or safe_read to target " +
    "specific symbols.",
  schema: { path: z.string(), start: z.number(), end: z.number() },
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
      const result = await workspace.readRange({
        path: args["path"] as string,
        start: args["start"] as number,
        end: args["end"] as number,
      });
      if ("projection" in result && result.projection === "refused") {
        ctx.metrics.recordRefusal();
      } else {
        ctx.metrics.recordRead();
      }
      return ctx.respond("read_range", result);
    };
  },
};
