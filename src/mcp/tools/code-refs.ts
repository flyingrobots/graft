import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { z } from "zod";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";
import { GitFileQuery, listGitFiles } from "./git-files.js";
import {
  evaluatePrecisionPolicy,
  loadFileContent,
  normalizeRepoPath,
} from "./precision.js";

const CODE_REFS_MODES = ["text", "import", "call", "property"] as const;

type CodeRefsMode = typeof CODE_REFS_MODES[number];
type SearchEngine = "ripgrep" | "grep";

class CodeRefsRequest {
  readonly query: string;
  readonly mode: CodeRefsMode;
  readonly dirPath: string;

  constructor(args: Record<string, unknown>, projectRoot: string) {
    const rawQuery = args["query"];
    const rawMode = args["mode"];
    const rawPath = args["path"];

    if (typeof rawQuery !== "string" || rawQuery.trim().length === 0) {
      throw new Error("CodeRefsRequest: query must be a non-empty string");
    }
    if (rawMode !== undefined && (typeof rawMode !== "string" || !CODE_REFS_MODES.includes(rawMode as CodeRefsMode))) {
      throw new Error("CodeRefsRequest: mode must be one of text, import, call, property");
    }
    if (rawPath !== undefined && typeof rawPath !== "string") {
      throw new Error("CodeRefsRequest: path must be a string when provided");
    }

    this.query = rawQuery.trim();
    this.mode = inferCodeRefsMode(this.query, rawMode as CodeRefsMode | undefined);
    this.dirPath = normalizeScopePath(projectRoot, rawPath);
    Object.freeze(this);
  }

  toProjectFileQuery(projectRoot: string): GitFileQuery {
    return GitFileQuery.project(projectRoot, this.dirPath);
  }

  scope(): string {
    return this.dirPath.length > 0 ? this.dirPath : ".";
  }
}

class CodeRefsMatch {
  readonly path: string;
  readonly line: number;
  readonly column?: number;
  readonly preview: string;

  constructor(opts: {
    path: string;
    line: number;
    column?: number;
    preview: string;
  }) {
    if (opts.path.trim().length === 0) {
      throw new Error("CodeRefsMatch: path must be non-empty");
    }
    if (!Number.isInteger(opts.line) || opts.line < 1) {
      throw new Error("CodeRefsMatch: line must be an integer >= 1");
    }
    if (opts.column !== undefined && (!Number.isInteger(opts.column) || opts.column < 1)) {
      throw new Error("CodeRefsMatch: column must be an integer >= 1");
    }
    if (opts.preview.length === 0) {
      throw new Error("CodeRefsMatch: preview must be non-empty");
    }

    this.path = opts.path.trim();
    this.line = opts.line;
    if (opts.column !== undefined) this.column = opts.column;
    this.preview = opts.preview;
    Object.freeze(this);
  }
}

class CodeRefsPattern {
  readonly mode: CodeRefsMode;
  readonly query: string;
  readonly pattern: string;
  readonly fixedStrings: boolean;
  readonly highlight: string;

  constructor(opts: {
    mode: CodeRefsMode;
    query: string;
    pattern: string;
    fixedStrings: boolean;
    highlight: string;
  }) {
    this.mode = opts.mode;
    this.query = opts.query;
    this.pattern = opts.pattern;
    this.fixedStrings = opts.fixedStrings;
    this.highlight = opts.highlight;
    Object.freeze(this);
  }
}

function inferCodeRefsMode(query: string, explicitMode?: CodeRefsMode): CodeRefsMode {
  if (explicitMode !== undefined) return explicitMode;
  if (query.startsWith(".")) return "property";
  if (query.endsWith("(")) return "call";
  return "text";
}

function normalizeScopePath(projectRoot: string, rawPath: unknown): string {
  if (typeof rawPath !== "string" || rawPath.trim().length === 0) {
    return "";
  }

  const normalized = normalizeRepoPath(projectRoot, rawPath);
  if (path.isAbsolute(normalized)) {
    throw new Error(`Path must stay inside the repository: ${rawPath}`);
  }

  const resolved = path.resolve(projectRoot, normalized);
  const rel = path.relative(projectRoot, resolved);
  if (rel.startsWith("..")) {
    throw new Error(`Path must stay inside the repository: ${rawPath}`);
  }

  return rel === "" || rel === "." ? "" : rel;
}

function escapeRegex(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildCodeRefsPattern(request: CodeRefsRequest): CodeRefsPattern {
  if (request.mode === "text") {
    return new CodeRefsPattern({
      mode: request.mode,
      query: request.query,
      pattern: request.query,
      fixedStrings: true,
      highlight: request.query,
    });
  }

  if (request.mode === "import") {
    const escaped = escapeRegex(request.query);
    return new CodeRefsPattern({
      mode: request.mode,
      query: request.query,
      pattern: `(\\bimport\\b.*\\b${escaped}\\b|\\bexport\\b.*\\b${escaped}\\b.*\\bfrom\\b)`,
      fixedStrings: false,
      highlight: request.query,
    });
  }

  if (request.mode === "call") {
    const normalizedQuery = request.query.endsWith("(")
      ? request.query.slice(0, -1).trim()
      : request.query;
    const escaped = escapeRegex(normalizedQuery);
    return new CodeRefsPattern({
      mode: request.mode,
      query: normalizedQuery,
      pattern: `\\b${escaped}\\s*\\(`,
      fixedStrings: false,
      highlight: normalizedQuery,
    });
  }

  const propertyName = request.query.startsWith(".")
    ? request.query.slice(1)
    : request.query.includes(".")
      ? request.query.split(".").at(-1) ?? request.query
      : request.query;
  const escaped = escapeRegex(propertyName);
  return new CodeRefsPattern({
    mode: request.mode,
    query: propertyName,
    pattern: `[?]?\\.${escaped}\\b`,
    fixedStrings: false,
    highlight: `.${propertyName}`,
  });
}

function buildRipgrepArgs(pattern: CodeRefsPattern, filePaths: readonly string[]): string[] {
  return [
    "--no-heading",
    "--line-number",
    "--column",
    "--color",
    "never",
    "--with-filename",
    ...(pattern.fixedStrings ? ["-F"] : []),
    "-e",
    pattern.pattern,
    "--",
    ...filePaths,
  ];
}

function buildGrepArgs(pattern: CodeRefsPattern, filePaths: readonly string[]): string[] {
  return [
    "-nH",
    "-F",
    pattern.highlight,
    "--",
    ...filePaths,
  ];
}

function computeColumn(preview: string, highlight: string): number | undefined {
  const index = preview.indexOf(highlight);
  return index >= 0 ? index + 1 : undefined;
}

function parseRipgrepLine(line: string): CodeRefsMatch | null {
  const match = /^(.*?):(\d+):(\d+):(.*)$/.exec(line);
  if (match === null) return null;
  const [, filePath, rawLine, rawColumn, preview] = match;
  return new CodeRefsMatch({
    path: filePath,
    line: Number(rawLine),
    column: Number(rawColumn),
    preview,
  });
}

function parseGrepLine(line: string, highlight: string): CodeRefsMatch | null {
  const match = /^(.*?):(\d+):(.*)$/.exec(line);
  if (match === null) return null;
  const [, filePath, rawLine, preview] = match;
  return new CodeRefsMatch({
    path: filePath,
    line: Number(rawLine),
    ...(computeColumn(preview, highlight) !== undefined
      ? { column: computeColumn(preview, highlight) }
      : {}),
    preview,
  });
}

function parseSearchOutput(
  stdout: string,
  parser: (line: string, highlight: string) => CodeRefsMatch | null,
  highlight: string,
): CodeRefsMatch[] {
  if (stdout.trim().length === 0) return [];
  return stdout
    .trim()
    .split("\n")
    .map((line) => parser(line, highlight))
    .filter((match): match is CodeRefsMatch => match !== null);
}

function parseRipgrepOutput(stdout: string): CodeRefsMatch[] {
  return parseSearchOutput(stdout, (line) => parseRipgrepLine(line), "");
}

function isRelevantReferencePreview(pattern: CodeRefsPattern, preview: string): boolean {
  const trimmed = preview.trim();

  if (pattern.mode === "text") {
    return true;
  }

  if (pattern.mode === "import") {
    return /\bimport\b/.test(trimmed) || (/\bexport\b/.test(trimmed) && /\bfrom\b/.test(trimmed));
  }

  if (pattern.mode === "call") {
    const escaped = escapeRegex(pattern.query);
    const functionDeclaration = new RegExp(`\\bfunction\\s+${escaped}\\s*\\(`);
    if (functionDeclaration.test(trimmed)) {
      return false;
    }

    const methodDeclaration = new RegExp(
      `^(?:export\\s+)?(?:async\\s+)?${escaped}\\s*\\([^)]*\\)\\s*(?::[^=]+)?\\{`,
    );
    return !methodDeclaration.test(trimmed);
  }

  return trimmed.includes(`.${pattern.query}`) || trimmed.includes(`?.${pattern.query}`);
}

function filterReferenceMatches(
  matches: readonly CodeRefsMatch[],
  pattern: CodeRefsPattern,
): CodeRefsMatch[] {
  return matches.filter((match) => isRelevantReferencePreview(pattern, match.preview));
}

function runSearchCommand(
  command: string,
  args: readonly string[],
  cwd: string,
): {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
} {
  const result = spawnSync(command, [...args], {
    cwd,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    ...(result.error !== undefined ? { error: result.error } : {}),
  };
}

function runTextFallbackSearch(
  projectRoot: string,
  pattern: CodeRefsPattern,
  filePaths: readonly string[],
): {
  engine: SearchEngine;
  matches: readonly CodeRefsMatch[];
} {
  if (filePaths.length === 0) {
    return { engine: "ripgrep", matches: [] };
  }

  const rg = runSearchCommand("rg", buildRipgrepArgs(pattern, filePaths), projectRoot);
  if (rg.error === undefined) {
    if (rg.status === 0) {
      return {
        engine: "ripgrep",
        matches: filterReferenceMatches(parseRipgrepOutput(rg.stdout), pattern),
      };
    }
    if (rg.status === 1) {
      return { engine: "ripgrep", matches: [] };
    }
    throw new Error(`ripgrep search failed: ${rg.stderr.trim()}`);
  }

  const grep = runSearchCommand("grep", buildGrepArgs(pattern, filePaths), projectRoot);
  if (grep.error === undefined) {
    if (grep.status === 0) {
      return {
        engine: "grep",
        matches: filterReferenceMatches(
          parseSearchOutput(grep.stdout, parseGrepLine, pattern.highlight),
          pattern,
        ),
      };
    }
    if (grep.status === 1) {
      return { engine: "grep", matches: [] };
    }
    throw new Error(`grep search failed: ${grep.stderr.trim()}`);
  }

  const rgMessage = rg.error instanceof Error ? rg.error.message : String(rg.error);
  const grepMessage = grep.error instanceof Error ? grep.error.message : String(grep.error);
  throw new Error(`reference search failed: ripgrep unavailable (${rgMessage}); grep unavailable (${grepMessage})`);
}

export const codeRefsTool: ToolDefinition = {
  name: "code_refs",
  description:
    "Search for import sites, callsites, property access, or literal text " +
    "references across the working tree. Returns explicit text-fallback " +
    "matches with the engine, pattern, and scope used.",
  schema: {
    query: z.string(),
    mode: z.enum(CODE_REFS_MODES).optional(),
    path: z.string().optional(),
  },
  createHandler(ctx: ToolContext): ToolHandler {
    return (args) => {
      const request = new CodeRefsRequest(args, ctx.projectRoot);
      const pattern = buildCodeRefsPattern(request);
      const repoState = ctx.getRepoState();
      const layer = repoState.dirty ? "workspace_overlay" : "ref_view";
      const filePaths = listGitFiles(request.toProjectFileQuery(ctx.projectRoot)).paths;
      const fallback = runTextFallbackSearch(ctx.projectRoot, pattern, filePaths);

      const visibleMatches: CodeRefsMatch[] = [];
      const fileCache = new Map<string, string>();
      let firstRefusal:
        | {
          path: string;
          reason: string;
          reasonDetail: string;
          next: readonly string[];
          actual: { lines: number; bytes: number };
        }
        | undefined;

      for (const match of fallback.matches) {
        let content = fileCache.get(match.path);
        if (content === undefined) {
          const loaded = loadFileContent(ctx, match.path);
          if (loaded === null) continue;
          fileCache.set(match.path, loaded);
          content = loaded;
        }

        const refusal = evaluatePrecisionPolicy(ctx, match.path, content);
        if (refusal !== null) {
          firstRefusal ??= refusal;
          continue;
        }

        visibleMatches.push(match);
      }

      if (visibleMatches.length === 0 && firstRefusal !== undefined) {
        return ctx.respond("code_refs", {
          query: request.query,
          mode: request.mode,
          scope: request.scope(),
          path: firstRefusal.path,
          projection: "refused",
          reason: firstRefusal.reason,
          reasonDetail: firstRefusal.reasonDetail,
          next: [...firstRefusal.next],
          actual: firstRefusal.actual,
          source: "text_fallback",
          provenance: {
            engine: fallback.engine,
            pattern: pattern.pattern,
            approximate: true,
            filesSearched: filePaths.length,
          },
          layer,
        });
      }

      return ctx.respond("code_refs", {
        query: request.query,
        mode: request.mode,
        scope: request.scope(),
        matches: visibleMatches,
        total: visibleMatches.length,
        source: "text_fallback",
        provenance: {
          engine: fallback.engine,
          pattern: pattern.pattern,
          approximate: true,
          filesSearched: filePaths.length,
        },
        layer,
      });
    };
  },
};
