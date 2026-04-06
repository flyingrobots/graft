import { z } from "zod";
import picomatch from "picomatch";
import { extractOutline } from "../../parser/outline.js";
import { detectLang } from "../../parser/lang.js";
import { evaluatePolicy } from "../../policy/evaluate.js";
import { RefusedResult } from "../../policy/types.js";
import type { OutlineEntry } from "../../parser/types.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";
import { listTrackedFiles } from "./git-files.js";

interface SymbolMatch {
  name: string;
  kind: string;
  path: string;
  signature?: string | undefined;
  exported: boolean;
  startLine?: number | undefined;
  endLine?: number | undefined;
}

function collectSymbols(
  entries: readonly OutlineEntry[],
  filePath: string,
  jumpTable: readonly { symbol: string; start: number; end: number }[],
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
      results.push(...collectSymbols(entry.children, filePath, jumpTable));
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

        const resolvedPath = ctx.resolvePath(filePath);
        let content: string;
        try {
          content = ctx.fs.readFileSync(resolvedPath, "utf-8");
        } catch {
          continue;
        }

        // Skip banned files — their symbols should not appear in search results
        const actual = { lines: content.split("\n").length, bytes: Buffer.byteLength(content) };
        const policy = evaluatePolicy(
          { path: resolvedPath, lines: actual.lines, bytes: actual.bytes },
          { sessionDepth: ctx.session.getSessionDepth() },
        );
        if (policy instanceof RefusedResult) continue;

        const result = extractOutline(content, lang);
        const symbols = collectSymbols(result.entries, filePath, result.jumpTable ?? []);

        for (const sym of symbols) {
          if (!isMatch(sym.name)) continue;
          if (kindFilter !== undefined && sym.kind.toLowerCase() !== kindFilter.toLowerCase()) continue;
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
