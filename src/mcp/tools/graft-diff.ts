import { graftDiff } from "../../operations/graft-diff.js";
import type { ToolHandler, ToolContext } from "../context.js";

export function createGraftDiffHandler(ctx: ToolContext): ToolHandler {
  return (args) => {
    const result = graftDiff({
      cwd: ctx.projectRoot,
      base: args["base"] as string | undefined,
      head: args["head"] as string | undefined,
      path: args["path"] as string | undefined,
    });
    return Promise.resolve(ctx.respond("graft_diff", result as unknown as Record<string, unknown>));
  };
}
