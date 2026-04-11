import * as path from "node:path";
import { z } from "zod";
import { STATE_FILENAME, stateSave, stateLoad } from "../../operations/state.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

export const stateSaveTool: ToolDefinition = {
  name: "state_save",
  description:
    "Save session working state (max 8 KB). Use for session bookmarks: " +
    "current task, files modified, next planned actions.",
  schema: { content: z.string() },
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      const result = await stateSave(args["content"] as string, {
        stateDir: ctx.graftDir,
        statePath: path.join(ctx.graftDir, STATE_FILENAME),
        fs: ctx.fs,
      });
      return ctx.respond("state_save", result as Record<string, unknown>);
    };
  },
};

export const stateLoadTool: ToolDefinition = {
  name: "state_load",
  description:
    "Load previously saved session state. Returns null if no state has " +
    "been saved.",
  createHandler(ctx: ToolContext): ToolHandler {
    return async () => {
      const result = await stateLoad({
        statePath: path.join(ctx.graftDir, STATE_FILENAME),
        fs: ctx.fs,
      });
      return ctx.respond("state_load", result as Record<string, unknown>);
    };
  },
};
