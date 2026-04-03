import * as path from "node:path";
import { readRange } from "../../operations/read-range.js";
import type { ToolHandler, ToolContext } from "../context.js";

export function createReadRangeHandler(ctx: ToolContext): ToolHandler {
  return async (args) => {
    const filePath = path.resolve(ctx.projectRoot, args["path"] as string);
    const result = await readRange(filePath, args["start"] as number, args["end"] as number);
    ctx.metrics.recordRead();
    return ctx.respond("read_range", result as unknown as Record<string, unknown>);
  };
}
