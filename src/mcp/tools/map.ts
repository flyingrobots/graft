import * as path from "node:path";
import { z } from "zod";
import { extractOutline } from "../../parser/outline.js";
import { detectLang } from "../../parser/lang.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";
import { GitFileQuery, listGitFiles } from "./git-files.js";
import { evaluateMcpRefusal, type McpPolicyRefusal } from "../policy.js";
import { collectSymbols, normalizeRepoPath } from "./precision.js";

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
  createHandler(ctx: ToolContext): ToolHandler {
    return (args) => {
      const request = new StructuralMapRequest(args, ctx.projectRoot);

      const filePaths = listGitFiles(request.toGitFileQuery(ctx.projectRoot), ctx.git).paths;
      const files: StructuralMapFile[] = [];
      const refused: McpPolicyRefusal[] = [];

      for (const filePath of filePaths) {
        let content: string;
        try {
          content = ctx.fs.readFileSync(path.join(ctx.projectRoot, filePath), "utf-8");
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
            signature: symbol.signature,
            exported: symbol.exported,
            startLine: symbol.startLine,
            endLine: symbol.endLine,
          })
        );

        files.push(new StructuralMapFile({ path: filePath, lang, symbols }));
      }

      files.sort((a, b) => a.path.localeCompare(b.path));
      const totalSymbols = files.reduce((n, f) => n + f.symbols.length, 0);

      return ctx.respond("graft_map", {
        directory: request.directory,
        files,
        ...(refused.length > 0 ? { refused } : {}),
        summary: `${String(files.length)} files, ${String(totalSymbols)} symbols`,
      });
    };
  },
};
