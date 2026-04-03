import { stateSave, stateLoad } from "../../operations/state.js";
import type { ToolHandler, ToolContext } from "../context.js";

export function createStateSaveHandler(ctx: ToolContext): ToolHandler {
  return async (args) => {
    const result = await stateSave(args["content"] as string, { graftDir: ctx.graftDir });
    return ctx.respond("state_save", result as Record<string, unknown>);
  };
}

export function createStateLoadHandler(ctx: ToolContext): ToolHandler {
  return async () => {
    const result = await stateLoad({ graftDir: ctx.graftDir });
    return ctx.respond("state_load", result as Record<string, unknown>);
  };
}
