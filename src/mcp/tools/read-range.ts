import { z } from "zod";
import type { ToolDefinition, ToolHandler } from "../context.js";
import { toJsonObject } from "../../operations/result-dto.js";
import { createRepoWorkspaceFromToolContext } from "../repo-workspace.js";

export const readRangeTool: ToolDefinition = {
  name: "read_range",
  description:
    "Read a bounded range of lines from a file. Maximum 250 lines. " +
    "Use jump table entries from file_outline or safe_read to target " +
    "specific symbols.",
  schema: { path: z.string(), start: z.number(), end: z.number(), cwd: z.string().optional() },
  // No policyCheck wrapper: it read the file again only to apply the policy
  // RepoWorkspace already applies, and refuses with the same shape.
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const filePath = ctx.resolvePath(args["path"] as string);
      const startLine = args["start"] as number;
      const endLine = args["end"] as number;
      // Through the workspace rather than straight at ctx.fs. This tool opened
      // its own door to the filesystem, so the single read authority
      // RepoWorkspace exists to hold was not the only way bytes reached a
      // caller, and workspace read policy never applied on this path.
      const workspace = createRepoWorkspaceFromToolContext(ctx);
      const result = await workspace.readRange({
        path: args["path"] as string,
        start: startLine,
        end: endLine,
      });
      if ("projection" in result) {
        ctx.metrics.recordRefusal();
      } else {
        ctx.metrics.recordRead();
      }
      ctx.recordFootprint({
        paths: [filePath],
        regions: [{ path: filePath, startLine, endLine }],
      });
      return ctx.respond("read_range", toJsonObject(result));
    };
  },
};
