import { readRange } from "../../operations/read-range.js";
import type { ToolHandler, ToolContext } from "../context.js";

export const READ_RANGE_DESCRIPTION =
  "Read a bounded range of lines from a file. Maximum 250 lines. " +
  "Use jump table entries from file_outline or safe_read to target " +
  "specific symbols.";

export function createReadRangeHandler(ctx: ToolContext): ToolHandler {
  return async (args) => {
    const filePath = ctx.resolvePath(args["path"] as string);
    const result = await readRange(filePath, args["start"] as number, args["end"] as number);
    ctx.metrics.recordRead();
    return ctx.respond("read_range", result as unknown as Record<string, unknown>);
  };
}
