import * as path from "node:path";
import { z } from "zod";
import picomatch from "picomatch";
import { extractOutline } from "../../parser/outline.js";
import { detectLang } from "../../parser/lang.js";
import type { OutlineEntry } from "../../parser/types.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";
import { execFileSync } from "node:child_process";

interface SymbolMatch {
  name: string;
  kind: string;
  path: string;
  signature?: string | undefined;
  exported: boolean;
  startLine?: number | undefined;
  endLine?: number | undefined;
}

function listTrackedFiles(dirPath: string, cwd: string): string[] {
  try {
    const args = dirPath.length > 0 ? ["ls-files", "--", dirPath] : ["ls-files"];
    return execFileSync("git", args, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] })
      .trim().split("\n").filter((l) => l.length > 0);
  } catch {
    return [];
  }
}

function collectSymbols(
  entries: readonly OutlineEntry[],
  filePath: string,
  jumpTable: readonly { symbol: string; start: number; end: number }[],
  _parentPath?: string,
): SymbolMatch[] {
  const results: SymbolMatch[] = [];
  for (const entry of entries) {
    const jump = jumpTable.find((j) => j.symbol === entry.name);
    results.push({
      name: entry.name,
      kind: entry.kind,
      path: filePath,
      signature: entry.signature,
      exported: entry.exported,
      startLine: jump?.start,
      endLine: jump?.end,
    });
    if (entry.children !== undefined && entry.children.length > 0) {
      results.push(...collectSymbols(entry.children, filePath, jumpTable, entry.name));
    }
  }
  return results;
}

export const codeFindTool: ToolDefinition = {
  name: "code_find",
  description:
    "Search for symbols across the project by name pattern. Returns " +
    "matches with file path, kind, signature, and line range. Use " +
    "code_show to read the source of a specific match.",
  schema: {
    query: z.string(),
    kind: z.string().optional(),
    path: z.string().optional(),
  },
  createHandler(ctx: ToolContext): ToolHandler {
    return (args) => {
      const query = args["query"] as string;
      const kindFilter = args["kind"] as string | undefined;
      const dirPath = (args["path"] as string | undefined) ?? "";

      const isMatch = picomatch(query, { nocase: true });

      const filePaths = listTrackedFiles(dirPath, ctx.projectRoot);
      const allMatches: SymbolMatch[] = [];

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
        const symbols = collectSymbols(result.entries, filePath, result.jumpTable ?? []);

        for (const sym of symbols) {
          if (!isMatch(sym.name)) continue;
          if (kindFilter !== undefined && sym.kind !== kindFilter) continue;
          allMatches.push(sym);
        }
      }

      allMatches.sort((a, b) => a.path.localeCompare(b.path) || a.name.localeCompare(b.name));

      return ctx.respond("code_find", {
        query,
        kind: kindFilter ?? null,
        matches: allMatches,
        total: allMatches.length,
        source: "live",
      });
    };
  },
};
