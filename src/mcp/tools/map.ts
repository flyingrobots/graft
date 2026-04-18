import { z } from "zod";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";
import { evaluateMcpRefusal } from "../policy.js";
import { toJsonObject } from "../../operations/result-dto.js";
import {
  StructuralMapRequest,
  StructuralMapMode,
  buildSummary,
  collectStructuralMap,
} from "./map-collector.js";

export const mapTool: ToolDefinition = {
  name: "graft_map",
  description:
    "Structural map of a directory — all files and their symbols " +
    "(function signatures, class shapes, exports) in one call. " +
    "Uses tree-sitter to parse the working tree directly, with optional " +
    "depth and summary controls for bounded overviews.",
  schema: {
    path: z.string().optional(),
    depth: z.number().int().nonnegative().optional(),
    summary: z.boolean().optional(),
  },
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      const request = new StructuralMapRequest(args, ctx.projectRoot);
      const collected = await collectStructuralMap(request, {
        projectRoot: ctx.projectRoot,
        fs: ctx.fs,
        git: ctx.git,
        refusalCheck: (filePath, actual) => evaluateMcpRefusal(ctx, filePath, actual),
      });

      const mode = new StructuralMapMode({ depth: request.depth, summary: request.summary });

      return ctx.respond("graft_map", toJsonObject({
        directory: request.directory,
        files: collected.files,
        ...(collected.directories.length > 0 ? { directories: collected.directories } : {}),
        ...(collected.refused.length > 0 ? { refused: collected.refused } : {}),
        mode,
        summary: buildSummary({
          returnedFileCount: collected.files.length,
          totalSymbolCount: collected.totalSymbols,
          summarizedDirectoryCount: collected.directories.length,
          depth: request.depth,
          summary: request.summary,
        }),
      }));
    };
  },
};
