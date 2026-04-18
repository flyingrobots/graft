import { z } from "zod";
import { readRange } from "../../operations/read-range.js";
import type { ToolDefinition, ToolHandler } from "../context.js";
import { toJsonObject } from "../../operations/result-dto.js";

export const readRangeTool: ToolDefinition = {
  name: "read_range",
  description:
    "Read a bounded range of lines from a file. Maximum 250 lines. " +
    "Use jump table entries from file_outline or safe_read to target " +
    "specific symbols.",
  schema: { path: z.string(), start: z.number(), end: z.number() },
  policyCheck: true,
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const filePath = ctx.resolvePath(args["path"] as string);
      const startLine = args["start"] as number;
      const endLine = args["end"] as number;
      const result = await readRange(filePath, startLine, endLine, { fs: ctx.fs });
      ctx.metrics.recordRead();
      ctx.recordFootprint({
        paths: [filePath],
        regions: [{ path: filePath, startLine, endLine }],
      });
      return ctx.respond("read_range", toJsonObject(result));
    };
  },
};
