import { z } from "zod";
import { indexCommits } from "../../warp/indexer.js";
import { directoryFilesLens, fileSymbolsLens } from "../../warp/observers.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

interface FileEntry {
  path: string;
  lang: string;
  symbols: { name: string; kind: string; signature?: string | undefined; exported: boolean; startLine?: number | undefined; endLine?: number | undefined }[];
}

export const mapTool: ToolDefinition = {
  name: "graft_map",
  description:
    "Structural map of a directory — all files and their symbols " +
    "(function signatures, class shapes, exports) in one call. " +
    "Powered by WARP. No file reads needed for indexed commits.",
  schema: {
    path: z.string().optional(),
  },
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      const dirPath = (args["path"] as string | undefined) ?? "";

      const warp = await ctx.getWarp();
      await indexCommits(warp, { cwd: ctx.projectRoot });
      await warp.core().materialize();

      // Observe files in the directory
      const fileObs = await warp.observer(directoryFilesLens(dirPath));
      const fileNodes = await fileObs.getNodes();

      const files: FileEntry[] = [];

      for (const fileNodeId of fileNodes) {
        const fileProps = await fileObs.getNodeProps(fileNodeId);
        if (fileProps === null) continue;

        const filePath = fileProps["path"] as string;
        const lang = fileProps["lang"] as string;

        // Observe symbols in this file
        const symObs = await warp.observer(fileSymbolsLens(filePath));
        const symNodes = await symObs.getNodes();

        const symbols: FileEntry["symbols"] = [];
        for (const symNodeId of symNodes) {
          const symProps = await symObs.getNodeProps(symNodeId);
          if (symProps === null) continue;
          symbols.push({
            name: symProps["name"] as string,
            kind: symProps["kind"] as string,
            signature: symProps["signature"] as string | undefined,
            exported: symProps["exported"] as boolean,
          });
        }

        files.push({ path: filePath, lang, symbols });
      }

      // Sort by path for stable output
      files.sort((a, b) => a.path.localeCompare(b.path));

      const totalSymbols = files.reduce((n, f) => n + f.symbols.length, 0);

      return ctx.respond("graft_map", {
        directory: dirPath.length > 0 ? dirPath : ".",
        files,
        summary: `${String(files.length)} files, ${String(totalSymbols)} symbols`,
      });
    };
  },
};
