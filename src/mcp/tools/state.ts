import * as path from "node:path";
import { z } from "zod";
import { STATE_FILENAME, stateSave, stateLoad } from "../../operations/state.js";
import type { ToolDefinition, ToolHandler } from "../context.js";
import { toJsonObject } from "../../operations/result-dto.js";

export const stateSaveTool: ToolDefinition = {
  name: "state_save",
  description:
    "Save session working state (max 8 KB). Use for session bookmarks: " +
    "current task, files modified, next planned actions.",
  schema: { content: z.string() },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const result = await stateSave(args["content"] as string, {
        stateDir: ctx.graftDir,
        statePath: path.join(ctx.graftDir, STATE_FILENAME),
        fs: ctx.fs,
      });
      return ctx.respond("state_save", toJsonObject(result));
    };
  },
};

export const stateLoadTool: ToolDefinition = {
  name: "state_load",
  description:
    "Load previously saved session state. Returns null if no state has " +
    "been saved.",
  createHandler(): ToolHandler {
    return async (_args, ctx) => {
      const result = await stateLoad({
        statePath: path.join(ctx.graftDir, STATE_FILENAME),
        fs: ctx.fs,
      });
      return ctx.respond("state_load", toJsonObject(result));
    };
  },
};
