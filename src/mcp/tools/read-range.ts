import { z } from "zod";
import { readRange } from "../../operations/read-range.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

export const readRangeTool: ToolDefinition = {
  name: "read_range",
  description:
    "Read a bounded range of lines from a file. Maximum 250 lines. " +
    "Use jump table entries from file_outline or safe_read to target " +
    "specific symbols.",
  schema: { path: z.string(), start: z.number(), end: z.number() },
  policyCheck: true,
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      const filePath = ctx.resolvePath(args["path"] as string);
      const result = await readRange(filePath, args["start"] as number, args["end"] as number, { fs: ctx.fs });
      ctx.metrics.recordRead();
      return ctx.respond("read_range", result);
    };
  },
};
