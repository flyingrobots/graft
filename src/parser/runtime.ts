import Parser from "web-tree-sitter";
import { createRequire } from "node:module";
import { detectLang } from "./lang.js";
import type { SupportedLang } from "./lang.js";

const esmRequire = createRequire(import.meta.url);

await Parser.init();

const tsLang = await Parser.Language.load(
  esmRequire.resolve("tree-sitter-wasms/out/tree-sitter-typescript.wasm"),
);
const tsxLang = await Parser.Language.load(
  esmRequire.resolve("tree-sitter-wasms/out/tree-sitter-tsx.wasm"),
);
const jsLang = await Parser.Language.load(
  esmRequire.resolve("tree-sitter-wasms/out/tree-sitter-javascript.wasm"),
);

function languageFor(format: SupportedLang): Parser.Language {
  switch (format) {
    case "ts":
      return tsLang;
    case "tsx":
      return tsxLang;
    case "js":
      return jsLang;
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

export function parseStructuredTree(
  format: SupportedLang,
  source: string,
): ParsedTree {
  const parser = new Parser();
  parser.setLanguage(languageFor(format));
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
