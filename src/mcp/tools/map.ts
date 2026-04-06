import * as path from "node:path";
import { z } from "zod";
import { extractOutline } from "../../parser/outline.js";
import { detectLang } from "../../parser/lang.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";
import { listTrackedFiles } from "./git-files.js";

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
    "Uses tree-sitter to parse the working tree directly.",
  schema: {
    path: z.string().optional(),
  },
  createHandler(ctx: ToolContext): ToolHandler {
    return (args) => {
      const dirPath = (args["path"] as string | undefined) ?? "";

      const filePaths = listTrackedFiles(dirPath, ctx.projectRoot);
      const files: FileEntry[] = [];

      for (const filePath of filePaths) {
        const lang = detectLang(filePath);
        if (lang === null) continue;

        let content: string;
        try {
          content = ctx.fs.readFileSync(path.join(ctx.projectRoot, filePath), "utf-8");
        } catch {
          continue;
        }

        const result = extractOutline(content, lang);
        const symbols: FileEntry["symbols"] = result.entries.map((entry) => {
          const jump = result.jumpTable?.find((j) => j.symbol === entry.name);
          return {
            name: entry.name,
            kind: entry.kind,
            signature: entry.signature,
            exported: entry.exported,
            startLine: jump?.start,
            endLine: jump?.end,
          };
        });

        files.push({ path: filePath, lang, symbols });
      }

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
