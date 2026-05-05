import Parser from "web-tree-sitter";
import { createRequire } from "node:module";
import { detectLang } from "./lang.js";
import type { SupportedLang } from "./lang.js";

const esmRequire = createRequire(import.meta.url);

interface ParserRuntime {
  readonly tsLang: Parser.Language;
  readonly tsxLang: Parser.Language;
  readonly jsLang: Parser.Language;
}

let parserRuntime: ParserRuntime | null = null;
let parserRuntimePromise: Promise<ParserRuntime> | null = null;

export class ParserRuntimeNotReadyError extends Error {
  constructor() {
    super(
      "Parser runtime is not ready; await ensureParserReady() before synchronous structured parsing.",
    );
    this.name = "ParserRuntimeNotReadyError";
  }
}

async function loadParserRuntime(): Promise<ParserRuntime> {
  if (parserRuntime !== null) {
    return parserRuntime;
  }
  if (parserRuntimePromise !== null) {
    return parserRuntimePromise;
  }

  parserRuntimePromise = (async () => {
    await Parser.init();
    const [tsLang, tsxLang, jsLang] = await Promise.all([
      Parser.Language.load(
        esmRequire.resolve("tree-sitter-wasms/out/tree-sitter-typescript.wasm"),
      ),
      Parser.Language.load(
        esmRequire.resolve("tree-sitter-wasms/out/tree-sitter-tsx.wasm"),
      ),
      Parser.Language.load(
        esmRequire.resolve("tree-sitter-wasms/out/tree-sitter-javascript.wasm"),
      ),
    ]);
    return { tsLang, tsxLang, jsLang };
  })();

  try {
    parserRuntime = await parserRuntimePromise;
    return parserRuntime;
  } catch (error) {
    parserRuntimePromise = null;
    throw error;
  }
}

function requireParserRuntime(): ParserRuntime {
  if (parserRuntime === null) {
    void loadParserRuntime();
    throw new ParserRuntimeNotReadyError();
  }
  return parserRuntime;
}

function languageFor(
  runtime: ParserRuntime,
  format: SupportedLang,
): Parser.Language {
  switch (format) {
    case "ts":
      return runtime.tsLang;
    case "tsx":
      return runtime.tsxLang;
    case "js":
      return runtime.jsLang;
  }
}

export interface ParsedTree {
  readonly format: SupportedLang;
  readonly parser: Parser;
  readonly tree: Parser.Tree;
  readonly root: Parser.SyntaxNode;
  readonly source: string;
  delete(): void;
}

function parseStructuredTreeWithRuntime(
  runtime: ParserRuntime,
  format: SupportedLang,
  source: string,
): ParsedTree {
  const parser = new Parser();
  parser.setLanguage(languageFor(runtime, format));
  const tree = parser.parse(source);
  const root = tree.rootNode;

  return {
    format,
    parser,
    tree,
    root,
    source,
    delete() {
      tree.delete();
      parser.delete();
    },
  };
}

export async function ensureParserReady(): Promise<void> {
  await loadParserRuntime();
}

export function isParserReady(): boolean {
  return parserRuntime !== null;
}

export function parseStructuredTree(
  format: SupportedLang,
  source: string,
): ParsedTree {
  return parseStructuredTreeWithRuntime(requireParserRuntime(), format, source);
}

export async function parseStructuredTreeAsync(
  format: SupportedLang,
  source: string,
): Promise<ParsedTree> {
  return parseStructuredTreeWithRuntime(await loadParserRuntime(), format, source);
}

export function parseStructuredTreeForFile(
  filePath: string,
  source: string,
): ParsedTree | null {
  const format = detectLang(filePath);
  if (format === null) {
    return null;
  }
  return parseStructuredTree(format, source);
}

export async function parseStructuredTreeForFileAsync(
  filePath: string,
  source: string,
): Promise<ParsedTree | null> {
  const format = detectLang(filePath);
  if (format === null) {
    return null;
  }
  return parseStructuredTreeAsync(format, source);
}
