import type Parser from "web-tree-sitter";
import { extractOutline } from "../parser/outline.js";
import {
  type BufferDiagnostic,
  type BufferOutlineResult,
  type BufferPoint,
  type BufferRange,
  type BufferSelection,
  type DiagnosticsResult,
  type FoldRegion,
  type FoldRegionsResult,
  type InjectionRegion,
  type InjectionResult,
  type NodeLookupResult,
  type NodeSummary,
  type RenamePreviewResult,
  type SelectionStepResult,
  type StructuredBufferSnapshot,
  type SymbolOccurrence,
  type SymbolOccurrencesResult,
  type SyntaxClass,
  type SyntaxSpan,
  type SyntaxSpanResult,
  type WarmProjectionBundleResult,
  collectIdentifierNodes,
  comparePoints,
  findCoveringNamedNode,
  isIdentifierType,
  nearestNamedChild,
  nodeRange,
  normalizeSelection,
  point,
  rangeOverlaps,
  rangesEqual,
  summarizeNode,
} from "./structured-buffer-model.js";

const KEYWORDS = new Set([
  "as",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "null",
  "private",
  "protected",
  "public",
  "readonly",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "type",
  "typeof",
  "var",
  "void",
  "while",
  "yield",
]);

const OPERATORS = new Set([
  "=",
  "=>",
  "+",
  "-",
  "*",
  "/",
  "%",
  "&&",
  "||",
  "??",
  "!",
  "!=",
  "!==",
  "==",
  "===",
  "<",
  "<=",
  ">",
  ">=",
  ".",
  "?.",
  ":",
  "|",
  "&",
]);

const PUNCTUATION = new Set(["(", ")", "{", "}", "[", "]", ";", ","]);

const FOLDABLE_NODE_TYPES = new Set([
  "class_declaration",
  "enum_declaration",
  "function_declaration",
  "generator_function_declaration",
  "interface_declaration",
  "method_definition",
  "object",
  "statement_block",
  "switch_body",
  "jsx_element",
  "jsx_fragment",
]);

interface SymbolResolution {
  readonly symbol: string;
  readonly kind: "declaration" | "occurrence";
  readonly nodeType: string;
}

function isLeaf(node: Parser.SyntaxNode): boolean {
  return node.childCount === 0;
}

function roleForIdentifier(node: Parser.SyntaxNode): SyntaxClass {
  const parent = node.parent;
  if (parent === null) {
    return node.type === "type_identifier" ? "type" : "variable";
  }
  const nameField = parent.childForFieldName("name");
  if (nameField !== null && nameField.id === node.id) {
    if (
      parent.type === "class_declaration"
      || parent.type === "interface_declaration"
      || parent.type === "type_alias_declaration"
      || parent.type === "enum_declaration"
    ) {
      return "type";
    }
    if (
      parent.type === "function_declaration"
      || parent.type === "generator_function_declaration"
      || parent.type === "method_definition"
      || parent.type === "function"
      || parent.type === "arrow_function"
    ) {
      return "function";
    }
  }
  if (node.type === "property_identifier" || parent.type === "member_expression" || parent.type === "pair") {
    return "property";
  }
  if (node.type === "type_identifier" || parent.type.includes("type")) {
    return "type";
  }
  return "variable";
}

function classifyLeaf(node: Parser.SyntaxNode): SyntaxClass | null {
  if (node.type === "comment") {
    return "comment";
  }
  if (node.parent?.type.includes("type") === true) {
    if (node.type === "type_identifier" || /^[A-Z]/.test(node.text)) {
      return "type";
    }
    if (new Set(["string", "number", "boolean", "unknown", "never", "void", "any"]).has(node.text)) {
      return "type";
    }
  }
  if (node.type === "string" || node.type === "template_string" || node.type === "regex") {
    return "string";
  }
  if (
    node.type === "number"
    || node.type === "number_literal"
    || node.type === "integer"
    || node.type === "float"
  ) {
    return "number";
  }
  if (isIdentifierType(node.type)) {
    return roleForIdentifier(node);
  }
  if (!node.isNamed()) {
    if (KEYWORDS.has(node.type)) {
      return "keyword";
    }
    if (PUNCTUATION.has(node.type)) {
      return "punctuation";
    }
    if (OPERATORS.has(node.type)) {
      return "operator";
    }
  }
  return null;
}

function collectMissingNodes(node: Parser.SyntaxNode, output: Parser.SyntaxNode[]): void {
  if (node.isMissing()) {
    output.push(node);
  }
  for (const child of node.children) {
    collectMissingNodes(child, output);
  }
}

function symbolNodeAt(root: Parser.SyntaxNode, position: BufferPoint): Parser.SyntaxNode | null {
  let current = root.descendantForPosition(position);
  while (!isIdentifierType(current.type)) {
    if (current.parent === null) {
      return null;
    }
    current = current.parent;
  }
  return current;
}

function fencedCodeInjections(source: string): InjectionRegion[] {
  const lines = source.split("\n");
  const regions: InjectionRegion[] = [];
  let active:
    | {
      readonly marker: string;
      readonly startRow: number;
      readonly language: string;
    }
    | undefined;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const open = /^\s*([`~]{3,})([A-Za-z0-9_-]+)?/.exec(line);
    if (active === undefined && open !== null) {
      active = {
        marker: open[1] ?? "```",
        startRow: index,
        language: open[2] ?? "code",
      };
      continue;
    }
    if (active !== undefined && new RegExp(`^\\s*${active.marker}\\s*$`).test(line)) {
      regions.push({
        language: active.language,
        range: {
          start: point(active.startRow, 0),
          end: point(index, line.length),
        },
        reason: "fenced_code_block",
        hint: active.language,
      });
      active = undefined;
    }
  }
  return regions;
}

function taggedTemplateInjections(source: string): InjectionRegion[] {
  const injections: InjectionRegion[] = [];
  const pattern = /\b([A-Za-z_][A-Za-z0-9_]*)`([\s\S]*?)`/g;
  for (const match of source.matchAll(pattern)) {
    const full = match[0];
    const tag = match[1] ?? "template";
    const startIndex = match.index;
    const start = point(
      source.slice(0, startIndex + tag.length).split("\n").length - 1,
      (source.slice(0, startIndex + tag.length).split("\n").at(-1) ?? "").length,
    );
    const end = point(
      source.slice(0, startIndex + full.length).split("\n").length - 1,
      (source.slice(0, startIndex + full.length).split("\n").at(-1) ?? "").length,
    );
    injections.push({
      language: tag,
      range: { start, end },
      reason: "tagged_template",
      hint: tag,
    });
  }
  return injections;
}

function tsInjections(root: Parser.SyntaxNode): InjectionRegion[] {
  const injections: InjectionRegion[] = [];
  for (const node of root.descendantsOfType([
    "jsx_element",
    "jsx_fragment",
    "jsx_self_closing_element",
  ])) {
    injections.push({
      language: "jsx",
      range: nodeRange(node),
      reason: "jsx_syntax",
      hint: node.type,
    });
  }
  return injections;
}

function resolveSymbol(
  root: Parser.SyntaxNode,
  opts: { position?: BufferPoint | undefined; symbol?: string | undefined },
): SymbolResolution | null {
  if (opts.symbol !== undefined) {
    return { symbol: opts.symbol, kind: "occurrence", nodeType: "identifier" };
  }
  if (opts.position === undefined) {
    return null;
  }
  const node = symbolNodeAt(root, opts.position);
  if (node === null) {
    return null;
  }
  const parent = node.parent;
  const declaration = parent?.childForFieldName("name")?.id === node.id;
  return {
    symbol: node.text,
    kind: declaration ? "declaration" : "occurrence",
    nodeType: node.type,
  };
}

export function buildOutlineResult(snapshot: StructuredBufferSnapshot): BufferOutlineResult {
  if (snapshot.format === null) {
    return {
      path: snapshot.path,
      format: snapshot.format,
      basis: snapshot.basis,
      outline: [],
      jumpTable: [],
      partial: false,
      reason: "UNSUPPORTED_LANGUAGE",
    };
  }
  const result = extractOutline(snapshot.content, snapshot.format);
  return {
    path: snapshot.path,
    format: snapshot.format,
    basis: snapshot.basis,
    outline: result.entries,
    jumpTable: result.jumpTable ?? [],
    partial: result.partial === true,
  };
}

export function buildInjectionResult(snapshot: StructuredBufferSnapshot): InjectionResult {
  if (snapshot.format === "md") {
    return {
      path: snapshot.path,
      format: snapshot.format,
      basis: snapshot.basis,
      injections: fencedCodeInjections(snapshot.content),
    };
  }
  if (snapshot.parsed === null) {
    return {
      path: snapshot.path,
      format: snapshot.format,
      basis: snapshot.basis,
      injections: [],
      reason: "UNSUPPORTED_LANGUAGE",
    };
  }
  return {
    path: snapshot.path,
    format: snapshot.format,
    basis: snapshot.basis,
    injections: [
      ...tsInjections(snapshot.parsed.root),
      ...taggedTemplateInjections(snapshot.content),
    ],
  };
}

export function buildSyntaxSpansResult(
  snapshot: StructuredBufferSnapshot,
  opts: { viewport?: BufferRange | undefined } = {},
): SyntaxSpanResult {
  if (snapshot.parsed === null) {
    return {
      path: snapshot.path,
      format: snapshot.format,
      basis: snapshot.basis,
      partial: snapshot.partial,
      spans: [],
      injections: buildInjectionResult(snapshot).injections,
      reason: "UNSUPPORTED_LANGUAGE",
    };
  }
  const viewport = opts.viewport;
  const spans: SyntaxSpan[] = [];
  const stack: Parser.SyntaxNode[] = [snapshot.parsed.root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) {
      continue;
    }
    const currentRange = nodeRange(node);
    if (viewport !== undefined && !rangeOverlaps(currentRange, viewport)) {
      continue;
    }
    if (
      (node.type === "comment" || node.type === "string" || node.type === "template_string" || node.type === "regex")
      && comparePoints(currentRange.start, currentRange.end) < 0
    ) {
      const className = classifyLeaf(node);
      if (className !== null) {
        spans.push({
          className,
          range: currentRange,
          text: node.text,
        });
      }
      continue;
    }
    if (isLeaf(node)) {
      const className = classifyLeaf(node);
      if (className !== null && comparePoints(currentRange.start, currentRange.end) < 0) {
        spans.push({
          className,
          range: currentRange,
          text: node.text,
        });
      }
      continue;
    }
    for (let index = node.children.length - 1; index >= 0; index -= 1) {
      const child = node.children[index];
      if (child !== undefined) {
        stack.push(child);
      }
    }
  }
  spans.sort((left, right) => {
    const startCompare = comparePoints(left.range.start, right.range.start);
    if (startCompare !== 0) {
      return startCompare;
    }
    return comparePoints(left.range.end, right.range.end);
  });
  return {
    path: snapshot.path,
    format: snapshot.format,
    basis: snapshot.basis,
    partial: snapshot.partial,
    spans,
    injections: buildInjectionResult(snapshot).injections,
  };
}

export function buildDiagnosticsResult(snapshot: StructuredBufferSnapshot): DiagnosticsResult {
  if (snapshot.parsed === null) {
    return {
      path: snapshot.path,
      format: snapshot.format,
      basis: snapshot.basis,
      partial: snapshot.partial,
      diagnostics: [],
      reason: "UNSUPPORTED_LANGUAGE",
    };
  }
  const diagnostics: BufferDiagnostic[] = [];
  for (const errorNode of snapshot.parsed.root.descendantsOfType("ERROR")) {
    diagnostics.push({
      severity: "error",
      code: "parse_error",
      message: "Parser found an error region in the buffer",
      range: nodeRange(errorNode),
    });
  }
  const missing: Parser.SyntaxNode[] = [];
  collectMissingNodes(snapshot.parsed.root, missing);
  for (const node of missing) {
    diagnostics.push({
      severity: "warning",
      code: "missing_node",
      message: `Parser inferred a missing ${node.type} node`,
      range: nodeRange(node),
    });
  }
  if (snapshot.partial && diagnostics.every((entry) => entry.code !== "parse_error")) {
    diagnostics.push({
      severity: "error",
      code: "parse_error",
      message: "Parser reported an incomplete or invalid syntax tree",
      range: nodeRange(snapshot.parsed.root),
    });
  }
  return {
    path: snapshot.path,
    format: snapshot.format,
    basis: snapshot.basis,
    partial: snapshot.partial,
    diagnostics,
  };
}

export function buildNodeLookupResult(snapshot: StructuredBufferSnapshot, position: BufferPoint): NodeLookupResult {
  if (snapshot.parsed === null) {
    return {
      path: snapshot.path,
      format: snapshot.format,
      basis: snapshot.basis,
      partial: snapshot.partial,
      node: null,
      parents: [],
      reason: "UNSUPPORTED_LANGUAGE",
    };
  }
  const node = snapshot.parsed.root.namedDescendantForPosition(position);
  const parents: NodeSummary[] = [];
  let current = node.parent;
  while (current !== null) {
    if (current.isNamed()) {
      parents.push(summarizeNode(current));
    }
    current = current.parent;
  }
  return {
    path: snapshot.path,
    format: snapshot.format,
    basis: snapshot.basis,
    partial: snapshot.partial,
    node: summarizeNode(node),
    parents,
  };
}

export function buildFoldRegionsResult(snapshot: StructuredBufferSnapshot): FoldRegionsResult {
  if (snapshot.format === "md") {
    const outline = buildOutlineResult(snapshot);
    return {
      path: snapshot.path,
      format: snapshot.format,
      basis: snapshot.basis,
      partial: outline.partial,
      regions: outline.jumpTable
        .filter((entry) => entry.end > entry.start)
        .map((entry) => ({
          kind: entry.kind,
          range: {
            start: point(entry.start - 1, 0),
            end: point(entry.end - 1, 0),
          },
        })),
    };
  }
  if (snapshot.parsed === null) {
    return {
      path: snapshot.path,
      format: snapshot.format,
      basis: snapshot.basis,
      partial: snapshot.partial,
      regions: [],
      reason: "UNSUPPORTED_LANGUAGE",
    };
  }
  const regions: FoldRegion[] = [];
  const stack: Parser.SyntaxNode[] = [snapshot.parsed.root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) {
      continue;
    }
    if (FOLDABLE_NODE_TYPES.has(node.type) && node.endPosition.row > node.startPosition.row) {
      regions.push({
        kind: node.type,
        range: nodeRange(node),
      });
    }
    for (let index = node.children.length - 1; index >= 0; index -= 1) {
      const child = node.children[index];
      if (child !== undefined) {
        stack.push(child);
      }
    }
  }
  return {
    path: snapshot.path,
    format: snapshot.format,
    basis: snapshot.basis,
    partial: snapshot.partial,
    regions,
  };
}

export function buildSelectionExpandResult(
  snapshot: StructuredBufferSnapshot,
  selection: BufferSelection,
): SelectionStepResult {
  if (snapshot.parsed === null) {
    return {
      path: snapshot.path,
      format: snapshot.format,
      basis: snapshot.basis,
      partial: snapshot.partial,
      range: null,
      node: null,
      reason: "UNSUPPORTED_LANGUAGE",
    };
  }
  const normalized = normalizeSelection(selection);
  let node = findCoveringNamedNode(snapshot.parsed.root, normalized);
  if (rangesEqual(nodeRange(node), normalized) && node.parent?.isNamed()) {
    node = node.parent;
  }
  return {
    path: snapshot.path,
    format: snapshot.format,
    basis: snapshot.basis,
    partial: snapshot.partial,
    range: nodeRange(node),
    node: summarizeNode(node),
  };
}

export function buildSelectionShrinkResult(
  snapshot: StructuredBufferSnapshot,
  selection: BufferRange,
): SelectionStepResult {
  if (snapshot.parsed === null) {
    return {
      path: snapshot.path,
      format: snapshot.format,
      basis: snapshot.basis,
      partial: snapshot.partial,
      range: null,
      node: null,
      reason: "UNSUPPORTED_LANGUAGE",
    };
  }
  const normalized = normalizeSelection(selection);
  const node = findCoveringNamedNode(snapshot.parsed.root, normalized);
  if (!rangesEqual(nodeRange(node), normalized)) {
    return {
      path: snapshot.path,
      format: snapshot.format,
      basis: snapshot.basis,
      partial: snapshot.partial,
      range: nodeRange(node),
      node: summarizeNode(node),
    };
  }
  const child = nearestNamedChild(node, normalized.start);
  if (child === null) {
    return {
      path: snapshot.path,
      format: snapshot.format,
      basis: snapshot.basis,
      partial: snapshot.partial,
      range: null,
      node: null,
      reason: "NO_SELECTION_STEP",
    };
  }
  return {
    path: snapshot.path,
    format: snapshot.format,
    basis: snapshot.basis,
    partial: snapshot.partial,
    range: nodeRange(child),
    node: summarizeNode(child),
  };
}

export function buildSymbolOccurrencesResult(
  snapshot: StructuredBufferSnapshot,
  opts: { position?: BufferPoint | undefined; symbol?: string | undefined } = {},
): SymbolOccurrencesResult {
  if (snapshot.parsed === null) {
    return {
      path: snapshot.path,
      format: snapshot.format,
      basis: snapshot.basis,
      partial: snapshot.partial,
      symbol: null,
      occurrences: [],
      scopeApplied: "buffer",
      reason: "UNSUPPORTED_LANGUAGE",
    };
  }
  const resolved = resolveSymbol(snapshot.parsed.root, opts);
  if (resolved === null) {
    return {
      path: snapshot.path,
      format: snapshot.format,
      basis: snapshot.basis,
      partial: snapshot.partial,
      symbol: null,
      occurrences: [],
      scopeApplied: "buffer",
      reason: "SYMBOL_NOT_FOUND",
    };
  }
  const identifiers: Parser.SyntaxNode[] = [];
  collectIdentifierNodes(snapshot.parsed.root, identifiers);
  const occurrences = identifiers
    .filter((node) => node.text === resolved.symbol && (node.type === resolved.nodeType || resolved.nodeType === "identifier"))
    .map((node) => {
      const declaration = node.parent?.childForFieldName("name")?.id === node.id;
      return {
        symbol: resolved.symbol,
        kind: declaration ? "declaration" : "occurrence",
        range: nodeRange(node),
      } satisfies SymbolOccurrence;
    });
  return {
    path: snapshot.path,
    format: snapshot.format,
    basis: snapshot.basis,
    partial: snapshot.partial,
    symbol: resolved.symbol,
    occurrences,
    scopeApplied: "buffer",
  };
}

export function buildRenamePreviewResult(
  snapshot: StructuredBufferSnapshot,
  opts: { nextName: string; position?: BufferPoint | undefined; symbol?: string | undefined },
): RenamePreviewResult {
  const occurrences = buildSymbolOccurrencesResult(snapshot, opts);
  if (occurrences.reason !== undefined) {
    return {
      path: snapshot.path,
      format: snapshot.format,
      basis: snapshot.basis,
      partial: snapshot.partial,
      symbol: occurrences.symbol,
      nextName: opts.nextName,
      edits: [],
      scopeApplied: "buffer",
      reason: occurrences.reason,
    };
  }
  return {
    path: snapshot.path,
    format: snapshot.format,
    basis: snapshot.basis,
    partial: snapshot.partial,
    symbol: occurrences.symbol,
    nextName: opts.nextName,
    edits: occurrences.occurrences.map((occurrence) => ({
      path: snapshot.path,
      range: occurrence.range,
      before: occurrences.symbol ?? "",
      after: opts.nextName,
    })),
    scopeApplied: "buffer",
  };
}

export function buildWarmProjectionBundleResult(
  snapshot: StructuredBufferSnapshot,
  opts: { viewport?: BufferRange | undefined } = {},
): WarmProjectionBundleResult {
  const syntax = buildSyntaxSpansResult(snapshot, { viewport: opts.viewport });
  const diagnostics = buildDiagnosticsResult(snapshot);
  const folds = buildFoldRegionsResult(snapshot);
  const outline = buildOutlineResult(snapshot);
  return {
    path: snapshot.path,
    format: snapshot.format,
    basis: snapshot.basis,
    partial: snapshot.partial,
    parseStatus: {
      basis: snapshot.basis,
      format: snapshot.format,
      partial: snapshot.partial,
      status: snapshot.format === null ? "unsupported" : snapshot.partial ? "partial" : "full",
      reason: snapshot.format === null ? "UNSUPPORTED_LANGUAGE" : undefined,
    },
    syntax,
    diagnostics,
    folds,
    outline,
  };
}
