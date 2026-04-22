import { buildKnowledgeMap } from "../../operations/knowledge-map.js";
import type { ToolDefinition, ToolHandler } from "../context.js";

export const knowledgeMapTool: ToolDefinition = {
  name: "knowledge_map",
  description:
    "Session knowledge map — answers \"what do I already know?\" " +
    "Lists all files and symbols observed this session, flags stale " +
    "files (changed since last read), and shows directory coverage. " +
    "Use before reading more files to avoid redundant context consumption.",
  createHandler(): ToolHandler {
    return async (_args, ctx) => {
      const result = await buildKnowledgeMap({
        cache: ctx.cache,
        fs: ctx.fs,
        projectRoot: ctx.projectRoot,
      });

      return ctx.respond("knowledge_map", {
        totalFiles: result.totalFiles,
        totalSymbols: result.totalSymbols,
        files: result.files.map((f) => ({
          path: f.path,
          symbols: [...f.symbols],
          readCount: f.readCount,
          lastReadAt: f.lastReadAt,
          stale: f.stale,
        })),
        staleFiles: [...result.staleFiles],
        directoryCoverage: result.directoryCoverage,
      });
    };
  },
};
