import type Parser from "web-tree-sitter";
import { detectStructuredFormat } from "../parser/lang.js";
import type { SupportedStructuredFormat } from "../parser/lang.js";
import { diffOutlines } from "../parser/diff.js";
import type { OutlineDiff } from "../parser/diff.js";
import { extractOutline } from "../parser/outline.js";
import { parseStructuredTreeForFile } from "../parser/runtime.js";
import type { OutlineEntry, JumpEntry } from "../parser/types.js";

export interface BufferPoint {
  readonly row: number;
  readonly column: number;
}

export interface BufferRange {
  readonly start: BufferPoint;
  readonly end: BufferPoint;
}

export type BufferSelection = BufferPoint | BufferRange;

export interface BufferOutlineResult {
  readonly path: string;
  readonly format: SupportedStructuredFormat | null;
  readonly outline: readonly OutlineEntry[];
  readonly jumpTable: readonly JumpEntry[];
  readonly partial: boolean;
  readonly reason?: "UNSUPPORTED_LANGUAGE" | undefined;
}

export type SyntaxClass =
  | "comment"
  | "function"
  | "keyword"
  | "number"
  | "operator"
  | "property"
  | "punctuation"
  | "string"
  | "type"
  | "variable";

export interface SyntaxSpan {
  readonly className: SyntaxClass;
  readonly range: BufferRange;
  readonly text: string;
}

export interface SyntaxSpanResult {
  readonly path: string;
  readonly format: SupportedStructuredFormat | null;
  readonly partial: boolean;
  readonly spans: readonly SyntaxSpan[];
  readonly injections: readonly InjectionRegion[];
  readonly reason?: "UNSUPPORTED_LANGUAGE" | undefined;
}

export interface BufferDiagnostic {
  readonly severity: "error" | "warning";
  readonly code: "parse_error" | "missing_node";
  readonly message: string;
  readonly range: BufferRange;
}

export interface DiagnosticsResult {
  readonly path: string;
  readonly format: SupportedStructuredFormat | null;
  readonly partial: boolean;
  readonly diagnostics: readonly BufferDiagnostic[];
  readonly reason?: "UNSUPPORTED_LANGUAGE" | undefined;
}

export interface NodeSummary {
  readonly type: string;
  readonly named: boolean;
  readonly range: BufferRange;
  readonly text: string;
  readonly name?: string | undefined;
}

export interface NodeLookupResult {
  readonly path: string;
  readonly format: SupportedStructuredFormat | null;
  readonly partial: boolean;
  readonly node: NodeSummary | null;
  readonly parents: readonly NodeSummary[];
  readonly reason?: "UNSUPPORTED_LANGUAGE" | undefined;
}

export interface InjectionRegion {
  readonly language: string;
  readonly range: BufferRange;
  readonly reason: "fenced_code_block" | "jsx_syntax" | "tagged_template";
  readonly hint?: string | undefined;
}

export interface InjectionResult {
  readonly path: string;
  readonly format: SupportedStructuredFormat | null;
  readonly injections: readonly InjectionRegion[];
  readonly reason?: "UNSUPPORTED_LANGUAGE" | undefined;
}

export interface FoldRegion {
  readonly kind: string;
  readonly range: BufferRange;
}

export interface FoldRegionsResult {
  readonly path: string;
  readonly format: SupportedStructuredFormat | null;
  readonly partial: boolean;
  readonly regions: readonly FoldRegion[];
  readonly reason?: "UNSUPPORTED_LANGUAGE" | undefined;
}

export interface SelectionStepResult {
  readonly path: string;
  readonly format: SupportedStructuredFormat | null;
  readonly partial: boolean;
  readonly range: BufferRange | null;
  readonly node: NodeSummary | null;
  readonly reason?: "UNSUPPORTED_LANGUAGE" | "NO_SELECTION_STEP" | undefined;
}

export interface SymbolOccurrence {
  readonly symbol: string;
  readonly kind: "declaration" | "occurrence";
  readonly range: BufferRange;
}

export interface SymbolOccurrencesResult {
  readonly path: string;
  readonly format: SupportedStructuredFormat | null;
  readonly partial: boolean;
  readonly symbol: string | null;
  readonly occurrences: readonly SymbolOccurrence[];
  readonly scopeApplied: "buffer";
  readonly reason?: "UNSUPPORTED_LANGUAGE" | "SYMBOL_NOT_FOUND" | undefined;
}

export interface RenameEditPreview {
  readonly path: string;
  readonly range: BufferRange;
  readonly before: string;
  readonly after: string;
}

export interface RenamePreviewResult {
  readonly path: string;
  readonly format: SupportedStructuredFormat | null;
  readonly partial: boolean;
  readonly symbol: string | null;
  readonly nextName: string;
  readonly edits: readonly RenameEditPreview[];
  readonly scopeApplied: "buffer";
  readonly reason?: "UNSUPPORTED_LANGUAGE" | "SYMBOL_NOT_FOUND" | undefined;
}

export interface ChangedRegion {
  readonly kind: "delete" | "insert" | "replace";
  readonly oldRange: BufferRange;
  readonly newRange: BufferRange;
  readonly oldText: string;
  readonly newText: string;
}

export interface StructuredBufferDiffResult {
  readonly path: string;
  readonly format: SupportedStructuredFormat | null;
  readonly partial: boolean;
  readonly outlineDiff: OutlineDiff;
  readonly changedRegions: readonly ChangedRegion[];
}

export type SemanticSummaryKind =
  | "no_changes"
  | "whitespace_only"
  | "comments_only"
  | "renamed_symbol"
  | "added_symbol"
  | "removed_symbol"
  | "changed_signature"
  | "changed_structure"
  | "changed_regions_only"
  | "mixed_edit";

export interface SemanticSummaryResult {
  readonly path: string;
  readonly format: SupportedStructuredFormat | null;
  readonly partial: boolean;
  readonly kind: SemanticSummaryKind;
  readonly summary: string;
  readonly facts: readonly string[];
}

export interface AnchorAffinityResult {
  readonly path: string;
  readonly format: SupportedStructuredFormat | null;
  readonly partial: boolean;
  readonly oldRange: BufferRange;
  readonly newRange: BufferRange | null;
  readonly status: "mapped" | "lost";
  readonly strategy: "named_path" | "named_search" | "text_search" | "none";
  readonly confidence: "high" | "medium" | "low";
  readonly reason?: "UNSUPPORTED_LANGUAGE" | "ANCHOR_NOT_FOUND" | undefined;
}

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

interface ParseState {
  readonly format: SupportedStructuredFormat | null;
  readonly parsed: ReturnType<typeof parseStructuredTreeForFile> | null;
  readonly partial: boolean;
}

function isPoint(value: BufferSelection): value is BufferPoint {
  return !("start" in value);
}

function point(row: number, column: number): BufferPoint {
  return { row, column };
}

function comparePoints(left: BufferPoint, right: BufferPoint): number {
  if (left.row !== right.row) {
    return left.row - right.row;
  }
  return left.column - right.column;
}

function range(start: BufferPoint, end: BufferPoint): BufferRange {
  return comparePoints(start, end) <= 0 ? { start, end } : { start: end, end: start };
}

function normalizeSelection(selection: BufferSelection): BufferRange {
  return isPoint(selection) ? { start: selection, end: selection } : range(selection.start, selection.end);
}

function buildLineStarts(source: string): number[] {
  const starts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "\n") {
      starts.push(index + 1);
    }
  }
  return starts;
}

function pointToIndex(source: string, value: BufferPoint): number {
  const starts = buildLineStarts(source);
  const lineStart = starts[value.row] ?? source.length;
  return Math.min(lineStart + value.column, source.length);
}

function indexToPoint(source: string, index: number): BufferPoint {
  const starts = buildLineStarts(source);
  let low = 0;
  let high = starts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const start = starts[mid] ?? 0;
    const next = starts[mid + 1] ?? source.length + 1;
    if (index < start) {
      high = mid - 1;
      continue;
    }
    if (index >= next) {
      low = mid + 1;
      continue;
    }
    return point(mid, index - start);
  }
  const lastRow = Math.max(starts.length - 1, 0);
  return point(lastRow, Math.max(index - (starts[lastRow] ?? 0), 0));
}

function nodeRange(node: Parser.SyntaxNode): BufferRange {
  return {
    start: point(node.startPosition.row, node.startPosition.column),
    end: point(node.endPosition.row, node.endPosition.column),
  };
}

function rangesEqual(left: BufferRange, right: BufferRange): boolean {
  return comparePoints(left.start, right.start) === 0 && comparePoints(left.end, right.end) === 0;
}

function rangeContainsRange(container: BufferRange, target: BufferRange): boolean {
  return comparePoints(container.start, target.start) <= 0 && comparePoints(container.end, target.end) >= 0;
}

function rangeOverlaps(left: BufferRange, right: BufferRange): boolean {
  return comparePoints(left.start, right.end) < 0 && comparePoints(right.start, left.end) < 0;
}

function emptyRangeAt(pointValue: BufferPoint): BufferRange {
  return { start: pointValue, end: pointValue };
}

function truncateText(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= 80) {
    return compact;
  }
  return `${compact.slice(0, 77)}...`;
}

function nodeName(node: Parser.SyntaxNode): string | undefined {
  return node.childForFieldName("name")?.text;
}

function summarizeNode(node: Parser.SyntaxNode): NodeSummary {
  return {
    type: node.type,
    named: node.isNamed(),
    range: nodeRange(node),
    text: truncateText(node.text),
    ...(nodeName(node) !== undefined ? { name: nodeName(node) } : {}),
  };
}

function isLeaf(node: Parser.SyntaxNode): boolean {
  return node.childCount === 0;
}

function isIdentifierType(type: string): boolean {
  return type === "identifier"
    || type === "property_identifier"
    || type === "private_property_identifier"
    || type === "type_identifier";
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

function findCoveringNamedNode(root: Parser.SyntaxNode, selection: BufferRange): Parser.SyntaxNode {
  let current = root.namedDescendantForPosition(selection.start, selection.end);
  while (current.parent !== null && current.parent.isNamed() && !rangeContainsRange(nodeRange(current), selection)) {
    current = current.parent;
  }
  while (!rangeContainsRange(nodeRange(current), selection) && current.parent !== null) {
    current = current.parent;
  }
  return current;
}

function nearestNamedChild(current: Parser.SyntaxNode, focus: BufferPoint): Parser.SyntaxNode | null {
  let child = current.namedDescendantForPosition(focus);
  if (child.id === current.id) {
    return null;
  }
  while (child.parent !== null && child.parent.id !== current.id) {
    child = child.parent;
  }
  return child.id === current.id ? null : child;
}

function collectIdentifierNodes(node: Parser.SyntaxNode, output: Parser.SyntaxNode[]): void {
  if (isIdentifierType(node.type)) {
    output.push(node);
  }
  for (const child of node.children) {
    collectIdentifierNodes(child, output);
  }
}

function namedChildIndex(parent: Parser.SyntaxNode, node: Parser.SyntaxNode): number | null {
  for (let index = 0; index < parent.namedChildren.length; index += 1) {
    const child = parent.namedChildren[index];
    if (child?.id === node.id) {
      return index;
    }
  }
  return null;
}

function buildNamedPath(node: Parser.SyntaxNode): number[] {
  const path: number[] = [];
  let current = node;
  for (;;) {
    if (current.parent === null) {
      break;
    }
    const parent: Parser.SyntaxNode = current.parent;
    const index = namedChildIndex(parent, current);
    if (index === null) {
      break;
    }
    path.push(index);
    current = parent;
  }
  path.reverse();
  return path;
}

function followNamedPath(root: Parser.SyntaxNode, path: readonly number[]): Parser.SyntaxNode | null {
  let current: Parser.SyntaxNode | null = root;
  for (const index of path) {
    current = current?.namedChildren[index] ?? null;
  }
  return current;
}

function lineTable(source: string): readonly string[] {
  return source.split("\n");
}

function lineRangeToRange(lines: readonly string[], startLine: number, endLineExclusive: number): BufferRange {
  if (startLine >= lines.length) {
    const row = Math.max(lines.length - 1, 0);
    return emptyRangeAt(point(row, lines[row]?.length ?? 0));
  }
  if (endLineExclusive <= startLine) {
    return emptyRangeAt(point(startLine, 0));
  }
  const endRow = Math.min(endLineExclusive - 1, lines.length - 1);
  return {
    start: point(startLine, 0),
    end: point(endRow, lines[endRow]?.length ?? 0),
  };
}

function lcsDiffRegions(oldSource: string, newSource: string): ChangedRegion[] {
  const oldLines = lineTable(oldSource);
  const newLines = lineTable(newSource);
  const rows = oldLines.length;
  const cols = newLines.length;
  const table: number[][] = Array.from(
    { length: rows + 1 },
    (): number[] => Array.from({ length: cols + 1 }, () => 0),
  );
  for (let row = rows - 1; row >= 0; row -= 1) {
    const rowEntry = table[row];
    if (rowEntry === undefined) {
      continue;
    }
    for (let col = cols - 1; col >= 0; col -= 1) {
      if (oldLines[row] === newLines[col]) {
        rowEntry[col] = (table[row + 1]?.[col + 1] ?? 0) + 1;
      } else {
        rowEntry[col] = Math.max(table[row + 1]?.[col] ?? 0, rowEntry[col + 1] ?? 0);
      }
    }
  }

  const operations: { readonly kind: "equal" | "delete" | "insert"; readonly oldIndex: number; readonly newIndex: number }[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  while (oldIndex < rows && newIndex < cols) {
    if (oldLines[oldIndex] === newLines[newIndex]) {
      operations.push({ kind: "equal", oldIndex, newIndex });
      oldIndex += 1;
      newIndex += 1;
      continue;
    }
    const down = table[oldIndex + 1]?.[newIndex] ?? 0;
    const right = table[oldIndex]?.[newIndex + 1] ?? 0;
    if (down >= right) {
      operations.push({ kind: "delete", oldIndex, newIndex });
      oldIndex += 1;
    } else {
      operations.push({ kind: "insert", oldIndex, newIndex });
      newIndex += 1;
    }
  }
  while (oldIndex < rows) {
    operations.push({ kind: "delete", oldIndex, newIndex });
    oldIndex += 1;
  }
  while (newIndex < cols) {
    operations.push({ kind: "insert", oldIndex, newIndex });
    newIndex += 1;
  }

  const regions: ChangedRegion[] = [];
  let index = 0;
  while (index < operations.length) {
    if (operations[index]?.kind === "equal") {
      index += 1;
      continue;
    }
    const startOld = operations[index]?.oldIndex ?? 0;
    const startNew = operations[index]?.newIndex ?? 0;
    let endOld = startOld;
    let endNew = startNew;
    while (index < operations.length && operations[index]?.kind !== "equal") {
      const op = operations[index];
      if (op?.kind === "delete") {
        endOld = op.oldIndex + 1;
      }
      if (op?.kind === "insert") {
        endNew = op.newIndex + 1;
      }
      index += 1;
    }
    regions.push({
      kind: endOld === startOld ? "insert" : (endNew === startNew ? "delete" : "replace"),
      oldRange: lineRangeToRange(oldLines, startOld, endOld),
      newRange: lineRangeToRange(newLines, startNew, endNew),
      oldText: oldLines.slice(startOld, endOld).join("\n"),
      newText: newLines.slice(startNew, endNew).join("\n"),
    });
  }
  return regions;
}

function envelopeDiffRegion(oldSource: string, newSource: string): ChangedRegion[] {
  let prefix = 0;
  while (prefix < oldSource.length && prefix < newSource.length && oldSource[prefix] === newSource[prefix]) {
    prefix += 1;
  }
  let oldSuffix = oldSource.length;
  let newSuffix = newSource.length;
  while (oldSuffix > prefix && newSuffix > prefix && oldSource[oldSuffix - 1] === newSource[newSuffix - 1]) {
    oldSuffix -= 1;
    newSuffix -= 1;
  }
  if (prefix === oldSource.length && prefix === newSource.length) {
    return [];
  }
  return [{
    kind: prefix === oldSuffix ? "insert" : (prefix === newSuffix ? "delete" : "replace"),
    oldRange: { start: indexToPoint(oldSource, prefix), end: indexToPoint(oldSource, oldSuffix) },
    newRange: { start: indexToPoint(newSource, prefix), end: indexToPoint(newSource, newSuffix) },
    oldText: oldSource.slice(prefix, oldSuffix),
    newText: newSource.slice(prefix, newSuffix),
  }];
}

function diffChangedRegions(oldSource: string, newSource: string): ChangedRegion[] {
  const totalLines = lineTable(oldSource).length * lineTable(newSource).length;
  if (totalLines <= 40000) {
    return lcsDiffRegions(oldSource, newSource);
  }
  return envelopeDiffRegion(oldSource, newSource);
}

function normalizedWithoutWhitespace(source: string): string {
  return source.replace(/\s+/g, "");
}

function stripCommentText(source: string, spans: readonly SyntaxSpan[]): string {
  const commentSpans = spans.filter((span) => span.className === "comment");
  if (commentSpans.length === 0) {
    return source;
  }
  const sorted = [...commentSpans].sort((left, right) => comparePoints(left.range.start, right.range.start));
  let cursor = 0;
  let output = "";
  for (const span of sorted) {
    const start = pointToIndex(source, span.range.start);
    const end = pointToIndex(source, span.range.end);
    if (start > cursor) {
      output += source.slice(cursor, start);
    }
    cursor = Math.max(cursor, end);
  }
  if (cursor < source.length) {
    output += source.slice(cursor);
  }
  return output;
}

function simpleRenameFact(diff: OutlineDiff): string | null {
  if (diff.added.length === 1 && diff.removed.length === 1 && diff.changed.length === 0) {
    const added = diff.added[0];
    const removed = diff.removed[0];
    if (added?.kind === removed?.kind && added !== undefined && removed !== undefined) {
      return `renamed ${removed.kind} ${removed.name} to ${added.name}`;
    }
  }
  return null;
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
    const start = indexToPoint(source, startIndex + tag.length);
    const end = indexToPoint(source, startIndex + full.length);
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

interface SymbolResolution {
  readonly symbol: string;
  readonly kind: "declaration" | "occurrence";
  readonly nodeType: string;
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

export class StructuredBuffer {
  readonly path: string;
  readonly content: string;
  readonly format: SupportedStructuredFormat | null;
  readonly partial: boolean;
  #disposed = false;
  #state: ParseState;

  constructor(opts: { path: string; content: string }) {
    this.path = opts.path;
    this.content = opts.content;
    const format = detectStructuredFormat(opts.path);
    const parsed = format === null || format === "md"
      ? null
      : parseStructuredTreeForFile(opts.path, opts.content);
    this.format = format;
    this.partial = parsed?.root.hasError() ?? false;
    this.#state = {
      format,
      parsed,
      partial: this.partial,
    };
  }

  dispose(): void {
    if (this.#disposed) {
      return;
    }
    this.#state.parsed?.delete();
    this.#disposed = true;
  }

  outline(): BufferOutlineResult {
    this.#assertLive();
    if (this.format === null) {
      return {
        path: this.path,
        format: this.format,
        outline: [],
        jumpTable: [],
        partial: false,
        reason: "UNSUPPORTED_LANGUAGE",
      };
    }
    const result = extractOutline(this.content, this.format);
    return {
      path: this.path,
      format: this.format,
      outline: result.entries,
      jumpTable: result.jumpTable ?? [],
      partial: result.partial === true,
    };
  }

  syntaxSpans(opts: { viewport?: BufferRange | undefined } = {}): SyntaxSpanResult {
    this.#assertLive();
    if (this.#state.parsed === null) {
      return {
        path: this.path,
        format: this.format,
        partial: this.partial,
        spans: [],
        injections: this.injections().injections,
        reason: "UNSUPPORTED_LANGUAGE",
      };
    }
    const viewport = opts.viewport;
    const spans: SyntaxSpan[] = [];
    const stack: Parser.SyntaxNode[] = [this.#state.parsed.root];
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
      path: this.path,
      format: this.format,
      partial: this.partial,
      spans,
      injections: this.injections().injections,
    };
  }

  diagnostics(): DiagnosticsResult {
    this.#assertLive();
    if (this.#state.parsed === null) {
      return {
        path: this.path,
        format: this.format,
        partial: this.partial,
        diagnostics: [],
        reason: "UNSUPPORTED_LANGUAGE",
      };
    }
    const diagnostics: BufferDiagnostic[] = [];
    for (const errorNode of this.#state.parsed.root.descendantsOfType("ERROR")) {
      diagnostics.push({
        severity: "error",
        code: "parse_error",
        message: "Parser found an error region in the buffer",
        range: nodeRange(errorNode),
      });
    }
    const missing: Parser.SyntaxNode[] = [];
    collectMissingNodes(this.#state.parsed.root, missing);
    for (const node of missing) {
      diagnostics.push({
        severity: "warning",
        code: "missing_node",
        message: `Parser inferred a missing ${node.type} node`,
        range: nodeRange(node),
      });
    }
    if (this.partial && diagnostics.every((entry) => entry.code !== "parse_error")) {
      diagnostics.push({
        severity: "error",
        code: "parse_error",
        message: "Parser reported an incomplete or invalid syntax tree",
        range: nodeRange(this.#state.parsed.root),
      });
    }
    return {
      path: this.path,
      format: this.format,
      partial: this.partial,
      diagnostics,
    };
  }

  nodeAt(position: BufferPoint): NodeLookupResult {
    this.#assertLive();
    if (this.#state.parsed === null) {
      return {
        path: this.path,
        format: this.format,
        partial: this.partial,
        node: null,
        parents: [],
        reason: "UNSUPPORTED_LANGUAGE",
      };
    }
    const node = this.#state.parsed.root.namedDescendantForPosition(position);
    const parents: NodeSummary[] = [];
    let current = node.parent;
    while (current !== null) {
      if (current.isNamed()) {
        parents.push(summarizeNode(current));
      }
      current = current.parent;
    }
    return {
      path: this.path,
      format: this.format,
      partial: this.partial,
      node: summarizeNode(node),
      parents,
    };
  }

  injections(): InjectionResult {
    this.#assertLive();
    if (this.format === "md") {
      return {
        path: this.path,
        format: this.format,
        injections: fencedCodeInjections(this.content),
      };
    }
    if (this.#state.parsed === null) {
      return {
        path: this.path,
        format: this.format,
        injections: [],
        reason: "UNSUPPORTED_LANGUAGE",
      };
    }
    return {
      path: this.path,
      format: this.format,
      injections: [
        ...tsInjections(this.#state.parsed.root),
        ...taggedTemplateInjections(this.content),
      ],
    };
  }

  foldRegions(): FoldRegionsResult {
    this.#assertLive();
    if (this.format === "md") {
      const outline = this.outline();
      return {
        path: this.path,
        format: this.format,
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
    if (this.#state.parsed === null) {
      return {
        path: this.path,
        format: this.format,
        partial: this.partial,
        regions: [],
        reason: "UNSUPPORTED_LANGUAGE",
      };
    }
    const regions: FoldRegion[] = [];
    const stack: Parser.SyntaxNode[] = [this.#state.parsed.root];
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
      path: this.path,
      format: this.format,
      partial: this.partial,
      regions,
    };
  }

  selectionExpand(selection: BufferSelection): SelectionStepResult {
    this.#assertLive();
    if (this.#state.parsed === null) {
      return {
        path: this.path,
        format: this.format,
        partial: this.partial,
        range: null,
        node: null,
        reason: "UNSUPPORTED_LANGUAGE",
      };
    }
    const normalized = normalizeSelection(selection);
    let node = findCoveringNamedNode(this.#state.parsed.root, normalized);
    if (rangesEqual(nodeRange(node), normalized) && node.parent?.isNamed()) {
      node = node.parent;
    }
    return {
      path: this.path,
      format: this.format,
      partial: this.partial,
      range: nodeRange(node),
      node: summarizeNode(node),
    };
  }

  selectionShrink(selection: BufferRange): SelectionStepResult {
    this.#assertLive();
    if (this.#state.parsed === null) {
      return {
        path: this.path,
        format: this.format,
        partial: this.partial,
        range: null,
        node: null,
        reason: "UNSUPPORTED_LANGUAGE",
      };
    }
    const normalized = normalizeSelection(selection);
    const node = findCoveringNamedNode(this.#state.parsed.root, normalized);
    if (!rangesEqual(nodeRange(node), normalized)) {
      return {
        path: this.path,
        format: this.format,
        partial: this.partial,
        range: nodeRange(node),
        node: summarizeNode(node),
      };
    }
    const child = nearestNamedChild(node, normalized.start);
    if (child === null) {
      return {
        path: this.path,
        format: this.format,
        partial: this.partial,
        range: null,
        node: null,
        reason: "NO_SELECTION_STEP",
      };
    }
    return {
      path: this.path,
      format: this.format,
      partial: this.partial,
      range: nodeRange(child),
      node: summarizeNode(child),
    };
  }

  symbolOccurrences(opts: { position?: BufferPoint | undefined; symbol?: string | undefined } = {}): SymbolOccurrencesResult {
    this.#assertLive();
    if (this.#state.parsed === null) {
      return {
        path: this.path,
        format: this.format,
        partial: this.partial,
        symbol: null,
        occurrences: [],
        scopeApplied: "buffer",
        reason: "UNSUPPORTED_LANGUAGE",
      };
    }
    const resolved = resolveSymbol(this.#state.parsed.root, opts);
    if (resolved === null) {
      return {
        path: this.path,
        format: this.format,
        partial: this.partial,
        symbol: null,
        occurrences: [],
        scopeApplied: "buffer",
        reason: "SYMBOL_NOT_FOUND",
      };
    }
    const identifiers: Parser.SyntaxNode[] = [];
    collectIdentifierNodes(this.#state.parsed.root, identifiers);
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
      path: this.path,
      format: this.format,
      partial: this.partial,
      symbol: resolved.symbol,
      occurrences,
      scopeApplied: "buffer",
    };
  }

  renamePreview(opts: { nextName: string; position?: BufferPoint | undefined; symbol?: string | undefined }): RenamePreviewResult {
    const occurrences = this.symbolOccurrences(opts);
    if (occurrences.reason !== undefined) {
      return {
        path: this.path,
        format: this.format,
        partial: this.partial,
        symbol: occurrences.symbol,
        nextName: opts.nextName,
        edits: [],
        scopeApplied: "buffer",
        reason: occurrences.reason,
      };
    }
    return {
      path: this.path,
      format: this.format,
      partial: this.partial,
      symbol: occurrences.symbol,
      nextName: opts.nextName,
      edits: occurrences.occurrences.map((occurrence) => ({
        path: this.path,
        range: occurrence.range,
        before: occurrences.symbol ?? "",
        after: opts.nextName,
      })),
      scopeApplied: "buffer",
    };
  }

  diff(next: StructuredBuffer): StructuredBufferDiffResult {
    this.#assertLive();
    next.#assertLive();
    const currentOutline = this.outline();
    const nextOutline = next.outline();
    return {
      path: next.path,
      format: next.format,
      partial: this.partial || next.partial,
      outlineDiff: diffOutlines(currentOutline.outline, nextOutline.outline),
      changedRegions: diffChangedRegions(this.content, next.content),
    };
  }

  semanticSummary(next: StructuredBuffer): SemanticSummaryResult {
    const diff = this.diff(next);
    if (this.content === next.content) {
      return {
        path: next.path,
        format: next.format,
        partial: diff.partial,
        kind: "no_changes",
        summary: "No changes",
        facts: [],
      };
    }
    if (normalizedWithoutWhitespace(this.content) === normalizedWithoutWhitespace(next.content)) {
      return {
        path: next.path,
        format: next.format,
        partial: diff.partial,
        kind: "whitespace_only",
        summary: "Edited whitespace only",
        facts: [],
      };
    }
    const currentWithoutComments = stripCommentText(this.content, this.syntaxSpans().spans);
    const nextWithoutComments = stripCommentText(next.content, next.syntaxSpans().spans);
    if (normalizedWithoutWhitespace(currentWithoutComments) === normalizedWithoutWhitespace(nextWithoutComments)) {
      return {
        path: next.path,
        format: next.format,
        partial: diff.partial,
        kind: "comments_only",
        summary: "Edited comments only",
        facts: [],
      };
    }
    const renameFact = simpleRenameFact(diff.outlineDiff);
    if (renameFact !== null) {
      return {
        path: next.path,
        format: next.format,
        partial: diff.partial,
        kind: "renamed_symbol",
        summary: renameFact,
        facts: [renameFact],
      };
    }
    if (diff.outlineDiff.added.length > 0 && diff.outlineDiff.removed.length === 0 && diff.outlineDiff.changed.length === 0) {
      const first = diff.outlineDiff.added[0];
      const summary = first === undefined ? "Added symbol" : `added ${first.kind} ${first.name}`;
      return {
        path: next.path,
        format: next.format,
        partial: diff.partial,
        kind: "added_symbol",
        summary,
        facts: [summary],
      };
    }
    if (diff.outlineDiff.removed.length > 0 && diff.outlineDiff.added.length === 0 && diff.outlineDiff.changed.length === 0) {
      const first = diff.outlineDiff.removed[0];
      const summary = first === undefined ? "Removed symbol" : `removed ${first.kind} ${first.name}`;
      return {
        path: next.path,
        format: next.format,
        partial: diff.partial,
        kind: "removed_symbol",
        summary,
        facts: [summary],
      };
    }
    const signatureChange = diff.outlineDiff.changed.find((entry) => entry.oldSignature !== undefined || entry.signature !== undefined);
    if (signatureChange !== undefined) {
      const summary = `changed signature for ${signatureChange.kind} ${signatureChange.name}`;
      return {
        path: next.path,
        format: next.format,
        partial: diff.partial,
        kind: "changed_signature",
        summary,
        facts: [summary],
      };
    }
    if (diff.outlineDiff.added.length > 0 || diff.outlineDiff.removed.length > 0 || diff.outlineDiff.changed.length > 0) {
      return {
        path: next.path,
        format: next.format,
        partial: diff.partial,
        kind: "changed_structure",
        summary: "Changed structure",
        facts: [
          `${String(diff.outlineDiff.added.length)} added`,
          `${String(diff.outlineDiff.removed.length)} removed`,
          `${String(diff.outlineDiff.changed.length)} changed`,
        ],
      };
    }
    if (diff.changedRegions.length > 0) {
      return {
        path: next.path,
        format: next.format,
        partial: diff.partial,
        kind: "changed_regions_only",
        summary: "Edited buffer regions without structural changes",
        facts: [`${String(diff.changedRegions.length)} changed region(s)`],
      };
    }
    return {
      path: next.path,
      format: next.format,
      partial: diff.partial,
      kind: "mixed_edit",
      summary: "Edited code",
      facts: [],
    };
  }

  mapRangeTo(next: StructuredBuffer, selection: BufferRange): AnchorAffinityResult {
    this.#assertLive();
    next.#assertLive();
    if (this.#state.parsed === null || next.#state.parsed === null) {
      return {
        path: next.path,
        format: next.format,
        partial: this.partial || next.partial,
        oldRange: selection,
        newRange: null,
        status: "lost",
        strategy: "none",
        confidence: "low",
        reason: "UNSUPPORTED_LANGUAGE",
      };
    }
    const target = findCoveringNamedNode(this.#state.parsed.root, normalizeSelection(selection));
    const pathMatch = followNamedPath(next.#state.parsed.root, buildNamedPath(target));
    if (pathMatch !== null && pathMatch.type === target.type) {
      return {
        path: next.path,
        format: next.format,
        partial: this.partial || next.partial,
        oldRange: selection,
        newRange: nodeRange(pathMatch),
        status: "mapped",
        strategy: "named_path",
        confidence: "high",
      };
    }
    const name = nodeName(target);
    if (name !== undefined) {
      const candidates = next.#state.parsed.root.descendantsOfType(target.type).filter((node) => nodeName(node) === name);
      const onlyCandidate = candidates[0];
      if (candidates.length === 1 && onlyCandidate !== undefined) {
        return {
          path: next.path,
          format: next.format,
          partial: this.partial || next.partial,
          oldRange: selection,
          newRange: nodeRange(onlyCandidate),
          status: "mapped",
          strategy: "named_search",
          confidence: "medium",
        };
      }
    }
    const textCandidates = next.#state.parsed.root.descendantsOfType(target.type).filter((node) => node.text === target.text);
    const onlyTextCandidate = textCandidates[0];
    if (textCandidates.length === 1 && onlyTextCandidate !== undefined) {
      return {
        path: next.path,
        format: next.format,
        partial: this.partial || next.partial,
        oldRange: selection,
        newRange: nodeRange(onlyTextCandidate),
        status: "mapped",
        strategy: "text_search",
        confidence: "low",
      };
    }
    return {
      path: next.path,
      format: next.format,
      partial: this.partial || next.partial,
      oldRange: selection,
      newRange: null,
      status: "lost",
      strategy: "none",
      confidence: "low",
      reason: "ANCHOR_NOT_FOUND",
    };
  }

  #assertLive(): void {
    if (this.#disposed) {
      throw new Error("StructuredBuffer has been disposed");
    }
  }
}
