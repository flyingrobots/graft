import Parser from "web-tree-sitter";
import { createRequire } from "node:module";
import type { OutlineEntry, JumpEntry, OutlineResult } from "./types.js";

const MAX_SIGNATURE_LENGTH = 199;

// ---------------------------------------------------------------------------
// WASM initialisation (top-level await — ESM only)
// ---------------------------------------------------------------------------

const esmRequire = createRequire(import.meta.url);

await Parser.init();

const tsLang = await Parser.Language.load(
  esmRequire.resolve("tree-sitter-wasms/out/tree-sitter-typescript.wasm"),
);
const jsLang = await Parser.Language.load(
  esmRequire.resolve("tree-sitter-wasms/out/tree-sitter-javascript.wasm"),
);

// ---------------------------------------------------------------------------
// Signature helpers
// ---------------------------------------------------------------------------

/** Compact object-literal default values: `= { ... }` becomes `= {…}`. */
function compactObjectDefaults(sig: string): string {
  return sig.replace(/=\s*\{[^}]*\}/g, "= {…}");
}

/** Truncate a signature to fit within MAX_SIGNATURE_LENGTH. */
function boundSignature(raw: string): string {
  let sig = compactObjectDefaults(raw);
  if (sig.length >= MAX_SIGNATURE_LENGTH) {
    sig = sig.slice(0, MAX_SIGNATURE_LENGTH - 1) + "…";
  }
  return sig;
}

// ---------------------------------------------------------------------------
// Tree-sitter node interface (avoids importing the Node class directly)
// ---------------------------------------------------------------------------

interface TSNode {
  readonly type: string;
  readonly text: string;
  readonly startPosition: { readonly row: number; readonly column: number };
  readonly endPosition: { readonly row: number; readonly column: number };
  readonly children: TSNode[];
  readonly namedChildren: TSNode[];
  readonly hasError: boolean;
  childForFieldName(name: string): TSNode | null;
}

// ---------------------------------------------------------------------------
// Node kind mapping
// ---------------------------------------------------------------------------

type EntryKind = OutlineEntry["kind"];

function nodeKind(nodeType: string): EntryKind | undefined {
  switch (nodeType) {
    case "function_declaration":
    case "generator_function_declaration":
      return "function";
    case "class_declaration":
      return "class";
    case "method_definition":
      return "method";
    case "interface_declaration":
      return "interface";
    case "type_alias_declaration":
      return "type";
    case "enum_declaration":
      return "enum";
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// Extraction helpers
// ---------------------------------------------------------------------------

function extractFunctionSignature(node: TSNode): string | undefined {
  const nameNode = node.childForFieldName("name");
  if (!nameNode) return undefined;

  const params = node.childForFieldName("parameters");
  const returnType = node.childForFieldName("return_type");

  let sig = nameNode.text;
  if (params) {
    sig += params.text;
  }
  if (returnType) {
    // return_type node text includes the leading `: ` in some grammars
    const rt = returnType.text.replace(/^:\s*/, "");
    sig += ": " + rt;
  }

  return boundSignature(sig);
}

function extractName(node: TSNode): string | undefined {
  const nameNode = node.childForFieldName("name");
  return nameNode?.text;
}

function extractClassChildren(node: TSNode): OutlineEntry[] {
  const body = node.childForFieldName("body");
  if (!body) return [];

  const children: OutlineEntry[] = [];
  for (const child of body.namedChildren) {
    if (child.type === "method_definition") {
      const name = extractName(child);
      if (!name) continue;

      const entry: OutlineEntry = {
        kind: "method",
        name,
        exported: false,
      };

      const sig = extractFunctionSignature(child);
      if (sig !== undefined) {
        entry.signature = sig;
      }

      children.push(entry);
    }
  }
  return children;
}

function processDeclaration(
  node: TSNode,
  exported: boolean,
): OutlineEntry | undefined {
  const kind = nodeKind(node.type);
  if (!kind) return undefined;

  const name = extractName(node);
  if (!name) return undefined;

  const entry: OutlineEntry = {
    kind,
    name,
    exported,
  };

  if (kind === "function") {
    const sig = extractFunctionSignature(node);
    if (sig !== undefined) {
      entry.signature = sig;
    }
  }

  if (kind === "class") {
    const children = extractClassChildren(node);
    if (children.length > 0) {
      entry.children = children;
    }
  }

  return entry;
}

function extractArrowSignature(name: string, arrowNode: TSNode): string | undefined {
  const params = arrowNode.childForFieldName("parameters");
  const returnType = arrowNode.childForFieldName("return_type");

  let sig = name;
  if (params) {
    sig += params.text;
  }
  if (returnType) {
    const rt = returnType.text.replace(/^:\s*/, "");
    sig += ": " + rt;
  }

  return boundSignature(sig);
}

function processLexicalExport(node: TSNode): OutlineEntry[] {
  const entries: OutlineEntry[] = [];
  for (const child of node.namedChildren) {
    if (child.type === "variable_declarator") {
      const name = extractName(child);
      if (!name) continue;

      // Check if the value is an arrow function or function expression
      const value = child.childForFieldName("value");
      if (value && (value.type === "arrow_function" || value.type === "function")) {
        const sig = extractArrowSignature(name, value);
        const entry: OutlineEntry = { kind: "function", name, exported: true };
        if (sig !== undefined) entry.signature = sig;
        entries.push(entry);
      } else {
        entries.push({ kind: "export", name, exported: true });
      }
    }
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Jump table builder
// ---------------------------------------------------------------------------

function buildJumpEntry(
  name: string,
  kind: string,
  node: TSNode,
): JumpEntry {
  return {
    symbol: name,
    kind,
    start: node.startPosition.row + 1,
    end: node.endPosition.row + 1,
  };
}

// ---------------------------------------------------------------------------
// Main extraction
// ---------------------------------------------------------------------------

/**
 * Extract a structural outline from source code.
 *
 * @param source - The source code text.
 * @param lang - Language identifier: `"ts"` or `"js"`. Defaults to `"ts"`.
 * @returns An {@link OutlineResult} with entries, jump table, and partial flag.
 */
export function extractOutline(
  source: string,
  lang: "ts" | "js" = "ts",
): OutlineResult {
  const parser = new Parser();
  parser.setLanguage(lang === "ts" ? tsLang : jsLang);

  const tree = parser.parse(source);
  const root = tree.rootNode as unknown as TSNode;

  const entries: OutlineEntry[] = [];
  const jumpTable: JumpEntry[] = [];
  const hasError = root.hasError;

  for (const child of root.children) {
    if (child.type === "export_statement") {
      // export_statement wraps a declaration
      const inner = child.namedChildren.find(
        (c) =>
          c.type === "function_declaration" ||
          c.type === "generator_function_declaration" ||
          c.type === "class_declaration" ||
          c.type === "interface_declaration" ||
          c.type === "type_alias_declaration" ||
          c.type === "enum_declaration",
      );

      if (inner) {
        const entry = processDeclaration(inner, true);
        if (entry) {
          entries.push(entry);
          jumpTable.push(buildJumpEntry(entry.name, entry.kind, child));
        }
        continue;
      }

      // Check for lexical declaration (const/let exports)
      const lexical = child.namedChildren.find(
        (c) => c.type === "lexical_declaration",
      );
      if (lexical) {
        const lexEntries = processLexicalExport(lexical);
        for (const entry of lexEntries) {
          entries.push(entry);
          jumpTable.push(buildJumpEntry(entry.name, entry.kind, child));
        }
        continue;
      }

      // Other export forms — skip
    } else {
      // Non-exported top-level declaration
      const kind = nodeKind(child.type);
      if (kind) {
        const entry = processDeclaration(child, false);
        if (entry) {
          entries.push(entry);
          jumpTable.push(buildJumpEntry(entry.name, entry.kind, child));
        }
      }
    }
  }

  parser.delete();
  tree.delete();

  const result: OutlineResult = {
    entries,
    jumpTable,
  };

  if (hasError) {
    result.partial = true;
  }

  return result;
}
