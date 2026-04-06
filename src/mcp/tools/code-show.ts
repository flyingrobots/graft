import { z } from "zod";
import { extractOutline } from "../../parser/outline.js";
import { detectLang } from "../../parser/lang.js";
import { readRange } from "../../operations/read-range.js";
import type { OutlineEntry } from "../../parser/types.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";
import { listTrackedFiles } from "./git-files.js";

interface SymbolLocation {
  name: string;
  kind: string;
  path: string;
  signature?: string | undefined;
  exported: boolean;
  startLine?: number | undefined;
  endLine?: number | undefined;
}

function findSymbol(
  entries: readonly OutlineEntry[],
  symbolName: string,
  jumpTable: readonly { symbol: string; start: number; end: number }[],
): { entry: OutlineEntry; start?: number | undefined; end?: number | undefined } | null {
  for (const entry of entries) {
    if (entry.name === symbolName) {
      const jump = jumpTable.find((j) => j.symbol === entry.name);
      return { entry, start: jump?.start, end: jump?.end };
    }
    if (entry.children !== undefined && entry.children.length > 0) {
      const found = findSymbol(entry.children, symbolName, jumpTable);
      if (found !== null) return found;
    }
  }
  return null;
}

export const codeShowTool: ToolDefinition = {
  name: "code_show",
  description:
    "Focus on a symbol by name and return its source code in one call. " +
    "Provide a path to target a specific file, or omit to search the " +
    "project. Returns source, signature, and location.",
  schema: {
    symbol: z.string(),
    path: z.string().optional(),
  },
  policyCheck: true,
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      const symbolName = args["symbol"] as string;
      const targetPath = args["path"] as string | undefined;

      const locations: SymbolLocation[] = [];
      const filePaths = targetPath !== undefined
        ? [targetPath]
        : listTrackedFiles("", ctx.projectRoot);

      for (const filePath of filePaths) {
        const lang = detectLang(filePath);
        if (lang === null) continue;

        const resolvedPath = ctx.resolvePath(filePath);
        let content: string;
        try {
          content = ctx.fs.readFileSync(resolvedPath, "utf-8");
        } catch {
          continue;
        }

        const result = extractOutline(content, lang);
        const found = findSymbol(result.entries, symbolName, result.jumpTable ?? []);
        if (found !== null) {
          locations.push({
            name: found.entry.name,
            kind: found.entry.kind,
            path: filePath,
            signature: found.entry.signature,
            exported: found.entry.exported,
            startLine: found.start,
            endLine: found.end,
          });
        }
      }

      if (locations.length === 0) {
        return ctx.respond("code_show", {
          symbol: symbolName,
          error: `Symbol '${symbolName}' not found`,
          source: "live",
        });
      }

      if (locations.length > 1 && targetPath === undefined) {
        return ctx.respond("code_show", {
          symbol: symbolName,
          ambiguous: true,
          matches: locations,
          source: "live",
        });
      }

      const loc = locations[0];
      if (loc?.startLine === undefined || loc.endLine === undefined) {
        return ctx.respond("code_show", {
          symbol: symbolName,
          kind: loc?.kind,
          signature: loc?.signature,
          path: loc?.path,
          exported: loc?.exported,
          error: "Symbol found but line range unavailable — use read_range with file_outline",
          source: "live",
        });
      }

      const resolvedPath = ctx.resolvePath(loc.path);
      const rangeResult = await readRange(resolvedPath, loc.startLine, loc.endLine, { fs: ctx.fs });

      return ctx.respond("code_show", {
        symbol: loc.name,
        kind: loc.kind,
        signature: loc.signature,
        path: loc.path,
        exported: loc.exported,
        startLine: loc.startLine,
        endLine: loc.endLine,
        content: rangeResult.content,
        truncated: rangeResult.truncated ?? false,
        source: "live",
      });
    };
  },
};
