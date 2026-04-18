import * as path from "node:path";
import { z } from "zod";
import { extractOutline } from "../../parser/outline.js";
import { detectLang } from "../../parser/lang.js";
import type { ToolDefinition, ToolHandler } from "../context.js";
import { GitFileQuery, listGitFiles } from "./git-files.js";
import { evaluateMcpRefusal, type McpPolicyRefusal } from "../policy.js";
import { collectSymbols, normalizeRepoPath } from "./precision.js";

/** Maximum files before auto-truncation to summary-only mode. */
export const MAX_MAP_FILES = 100;

/** Maximum response bytes before auto-truncation to summary-only mode. */
export const MAX_MAP_BYTES = 50_000;

class StructuralMapRequest {
  readonly directory: string;

  constructor(args: Record<string, unknown>, projectRoot: string) {
    const rawPath = args["path"];
    if (rawPath !== undefined && typeof rawPath !== "string") {
      throw new Error("StructuralMapRequest: path must be a string when provided");
    }
    this.directory = rawPath !== undefined && rawPath.trim().length > 0
      ? normalizeRepoPath(projectRoot, rawPath)
      : ".";
    Object.freeze(this);
  }

  toGitFileQuery(projectRoot: string): GitFileQuery {
    return GitFileQuery.project(projectRoot, this.directory === "." ? "" : this.directory);
  }
}

class StructuralMapSymbol {
  readonly name: string;
  readonly kind: string;
  readonly signature?: string;
  readonly exported: boolean;
  readonly startLine?: number;
  readonly endLine?: number;

  constructor(opts: {
    name: string;
    kind: string;
    signature?: string;
    exported: boolean;
    startLine?: number;
    endLine?: number;
  }) {
    this.name = opts.name;
    this.kind = opts.kind;
    this.exported = opts.exported;
    if (opts.signature !== undefined) this.signature = opts.signature;
    if (opts.startLine !== undefined) this.startLine = opts.startLine;
    if (opts.endLine !== undefined) this.endLine = opts.endLine;
    Object.freeze(this);
  }
}

class StructuralMapFile {
  path: string;
  lang: string;
  symbols: readonly StructuralMapSymbol[];

  constructor(opts: {
    path: string;
    lang: string;
    symbols: readonly StructuralMapSymbol[];
  }) {
    this.path = opts.path;
    this.lang = opts.lang;
    this.symbols = Object.freeze([...opts.symbols]);
    Object.freeze(this);
  }
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
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const request = new StructuralMapRequest(args, ctx.projectRoot);

      // Budget gate: if the session budget is exhausted, return summary-only.
      const budget = ctx.governor.getBudget();
      if (budget !== null && budget.remaining <= 0) {
        const filePaths = (await listGitFiles(request.toGitFileQuery(ctx.projectRoot), ctx.git)).paths;
        return ctx.respond("graft_map", {
          directory: request.directory,
          files: [],
          summary: `${String(filePaths.length)} files (budget exhausted — summary only)`,
          truncated: true,
          truncatedReason: "BUDGET_EXHAUSTED",
        });
      }

      const filePaths = (await listGitFiles(request.toGitFileQuery(ctx.projectRoot), ctx.git)).paths;
      const files: StructuralMapFile[] = [];
      const refused: McpPolicyRefusal[] = [];

      for (const filePath of filePaths) {
        let content: string;
        try {
          content = await ctx.fs.readFile(path.join(ctx.projectRoot, filePath), "utf-8");
        } catch {
          continue;
        }

        const actual = {
          lines: content.split("\n").length,
          bytes: Buffer.byteLength(content),
        };
        const refusal = evaluateMcpRefusal(ctx, filePath, actual);
        if (refusal !== null) {
          refused.push(refusal);
          continue;
        }

        const lang = detectLang(filePath);
        if (lang === null) continue;

        const result = extractOutline(content, lang);
        const symbols = collectSymbols(result.entries, filePath, result.jumpTable ?? []).map((symbol) =>
          new StructuralMapSymbol({
            name: symbol.name,
            kind: symbol.kind,
            exported: symbol.exported,
            ...(symbol.signature !== undefined ? { signature: symbol.signature } : {}),
            ...(symbol.startLine !== undefined ? { startLine: symbol.startLine } : {}),
            ...(symbol.endLine !== undefined ? { endLine: symbol.endLine } : {}),
          })
        );

        files.push(new StructuralMapFile({ path: filePath, lang, symbols }));
      }

      files.sort((a, b) => a.path.localeCompare(b.path));
      const totalFiles = files.length;
      const totalSymbols = files.reduce((n, f) => n + f.symbols.length, 0);

      // Size gate: if the result exceeds limits, switch to summary-only.
      const serialized = JSON.stringify(files);
      const responseBytes = Buffer.byteLength(serialized);

      if (totalFiles > MAX_MAP_FILES || responseBytes > MAX_MAP_BYTES) {
        // Build per-language file counts for the summary.
        const langCounts = new Map<string, number>();
        for (const f of files) {
          langCounts.set(f.lang, (langCounts.get(f.lang) ?? 0) + 1);
        }
        const langBreakdown = [...langCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([lang, count]) => `${lang}: ${String(count)}`)
          .join(", ");

        return ctx.respond("graft_map", {
          directory: request.directory,
          files: [],
          ...(refused.length > 0 ? { refused } : {}),
          summary: `${String(totalFiles)} files, ${String(totalSymbols)} symbols (${langBreakdown})`,
          truncated: true,
          truncatedReason: "OUTPUT_LIMIT",
          next: [
            "Narrow the path argument to a specific subdirectory",
            `Current: ${String(totalFiles)} files, ${String(Math.round(responseBytes / 1024))}KB — limit: ${String(MAX_MAP_FILES)} files / ${String(Math.round(MAX_MAP_BYTES / 1024))}KB`,
          ],
        });
      }

      return ctx.respond("graft_map", {
        directory: request.directory,
        files,
        ...(refused.length > 0 ? { refused } : {}),
        summary: `${String(files.length)} files, ${String(totalSymbols)} symbols`,
      });
    };
  },
};
