import { stateSave, stateLoad } from "../../operations/state.js";
import type { ToolHandler, ToolContext } from "../context.js";

export const STATE_SAVE_DESCRIPTION =
  "Save session working state (max 8 KB). Use for session bookmarks: " +
  "current task, files modified, next planned actions.";

export const STATE_LOAD_DESCRIPTION =
  "Load previously saved session state. Returns null if no state has " +
  "been saved.";

export function createStateSaveHandler(ctx: ToolContext): ToolHandler {
  return async (args) => {
    const result = await stateSave(args["content"] as string, { graftDir: ctx.graftDir, fs: ctx.fs });
    return ctx.respond("state_save", result as Record<string, unknown>);
  };
}

export function createStateLoadHandler(ctx: ToolContext): ToolHandler {
  return async () => {
    const result = await stateLoad({ graftDir: ctx.graftDir, fs: ctx.fs });
    return ctx.respond("state_load", result as Record<string, unknown>);
  };
}
