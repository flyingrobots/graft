import type Parser from "web-tree-sitter";
import { detectStructuredFormat } from "../parser/lang.js";
import type { SupportedStructuredFormat } from "../parser/lang.js";
import type { OutlineDiff } from "../parser/diff.js";
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

export interface WarmProjectionBasis {
  readonly kind: "editor_head";
  readonly headId: string;
  readonly tick?: number | undefined;
  readonly editGroupId?: string | undefined;
}

export interface BufferOutlineResult {
  readonly path: string;
  readonly format: SupportedStructuredFormat | null;
  readonly basis: WarmProjectionBasis | null;
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
  readonly basis: WarmProjectionBasis | null;
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
  readonly basis: WarmProjectionBasis | null;
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
  readonly basis: WarmProjectionBasis | null;
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
  readonly basis: WarmProjectionBasis | null;
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
  readonly basis: WarmProjectionBasis | null;
  readonly partial: boolean;
  readonly regions: readonly FoldRegion[];
  readonly reason?: "UNSUPPORTED_LANGUAGE" | undefined;
}

export interface WarmProjectionParseStatus {
  readonly basis: WarmProjectionBasis | null;
  readonly format: SupportedStructuredFormat | null;
  readonly partial: boolean;
  readonly status: "full" | "partial" | "unsupported";
  readonly reason?: "UNSUPPORTED_LANGUAGE" | undefined;
}

export interface WarmProjectionBundleResult {
  readonly path: string;
  readonly format: SupportedStructuredFormat | null;
  readonly basis: WarmProjectionBasis | null;
  readonly partial: boolean;
  readonly parseStatus: WarmProjectionParseStatus;
  readonly syntax: SyntaxSpanResult;
  readonly diagnostics: DiagnosticsResult;
  readonly folds: FoldRegionsResult;
  readonly outline: BufferOutlineResult;
}

export interface SelectionStepResult {
  readonly path: string;
  readonly format: SupportedStructuredFormat | null;
  readonly basis: WarmProjectionBasis | null;
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
  readonly basis: WarmProjectionBasis | null;
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
  readonly basis: WarmProjectionBasis | null;
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
  readonly fromBasis: WarmProjectionBasis | null;
  readonly toBasis: WarmProjectionBasis | null;
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
  readonly fromBasis: WarmProjectionBasis | null;
  readonly toBasis: WarmProjectionBasis | null;
  readonly partial: boolean;
  readonly kind: SemanticSummaryKind;
  readonly summary: string;
  readonly facts: readonly string[];
}

export interface AnchorAffinityResult {
  readonly path: string;
  readonly format: SupportedStructuredFormat | null;
  readonly fromBasis: WarmProjectionBasis | null;
  readonly toBasis: WarmProjectionBasis | null;
  readonly partial: boolean;
  readonly oldRange: BufferRange;
  readonly newRange: BufferRange | null;
  readonly status: "mapped" | "lost";
  readonly strategy: "named_path" | "named_search" | "text_search" | "none";
  readonly confidence: "high" | "medium" | "low";
  readonly reason?: "UNSUPPORTED_LANGUAGE" | "ANCHOR_NOT_FOUND" | undefined;
}

export interface StructuredBufferSnapshot {
  readonly path: string;
  readonly content: string;
  readonly format: SupportedStructuredFormat | null;
  readonly basis: WarmProjectionBasis | null;
  readonly partial: boolean;
  readonly parsed: ReturnType<typeof parseStructuredTreeForFile> | null;
}

export function createStructuredBufferSnapshot(opts: {
  path: string;
  content: string;
  basis?: WarmProjectionBasis | undefined;
}): StructuredBufferSnapshot {
  const format = detectStructuredFormat(opts.path);
  const parsed = format === null || format === "md"
    ? null
    : parseStructuredTreeForFile(opts.path, opts.content);
  return {
    path: opts.path,
    content: opts.content,
    format,
    basis: opts.basis ?? null,
    partial: parsed?.root.hasError() ?? false,
    parsed,
  };
}

export function isPoint(value: BufferSelection): value is BufferPoint {
  return !("start" in value);
}

export function point(row: number, column: number): BufferPoint {
  return { row, column };
}

export function comparePoints(left: BufferPoint, right: BufferPoint): number {
  if (left.row !== right.row) {
    return left.row - right.row;
  }
  return left.column - right.column;
}

export function range(start: BufferPoint, end: BufferPoint): BufferRange {
  return comparePoints(start, end) <= 0 ? { start, end } : { start: end, end: start };
}

export function normalizeSelection(selection: BufferSelection): BufferRange {
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

export function pointToIndex(source: string, value: BufferPoint): number {
  const starts = buildLineStarts(source);
  const lineStart = starts[value.row] ?? source.length;
  return Math.min(lineStart + value.column, source.length);
}

export function indexToPoint(source: string, index: number): BufferPoint {
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

export function nodeRange(node: Parser.SyntaxNode): BufferRange {
  return {
    start: point(node.startPosition.row, node.startPosition.column),
    end: point(node.endPosition.row, node.endPosition.column),
  };
}

export function rangesEqual(left: BufferRange, right: BufferRange): boolean {
  return comparePoints(left.start, right.start) === 0 && comparePoints(left.end, right.end) === 0;
}

export function rangeContainsRange(container: BufferRange, target: BufferRange): boolean {
  return comparePoints(container.start, target.start) <= 0 && comparePoints(container.end, target.end) >= 0;
}

export function rangeOverlaps(left: BufferRange, right: BufferRange): boolean {
  return comparePoints(left.start, right.end) < 0 && comparePoints(right.start, left.end) < 0;
}

export function emptyRangeAt(pointValue: BufferPoint): BufferRange {
  return { start: pointValue, end: pointValue };
}

function truncateText(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= 80) {
    return compact;
  }
  return `${compact.slice(0, 77)}...`;
}

export function nodeName(node: Parser.SyntaxNode): string | undefined {
  return node.childForFieldName("name")?.text;
}

export function summarizeNode(node: Parser.SyntaxNode): NodeSummary {
  return {
    type: node.type,
    named: node.isNamed(),
    range: nodeRange(node),
    text: truncateText(node.text),
    ...(nodeName(node) !== undefined ? { name: nodeName(node) } : {}),
  };
}

export function isIdentifierType(type: string): boolean {
  return type === "identifier"
    || type === "property_identifier"
    || type === "private_property_identifier"
    || type === "type_identifier";
}

export function findCoveringNamedNode(root: Parser.SyntaxNode, selection: BufferRange): Parser.SyntaxNode {
  let current = root.namedDescendantForPosition(selection.start, selection.end);
  while (current.parent !== null && current.parent.isNamed() && !rangeContainsRange(nodeRange(current), selection)) {
    current = current.parent;
  }
  while (!rangeContainsRange(nodeRange(current), selection) && current.parent !== null) {
    current = current.parent;
  }
  return current;
}

export function nearestNamedChild(current: Parser.SyntaxNode, focus: BufferPoint): Parser.SyntaxNode | null {
  let child = current.namedDescendantForPosition(focus);
  if (child.id === current.id) {
    return null;
  }
  while (child.parent !== null && child.parent.id !== current.id) {
    child = child.parent;
  }
  return child.id === current.id ? null : child;
}

export function collectIdentifierNodes(node: Parser.SyntaxNode, output: Parser.SyntaxNode[]): void {
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

export function buildNamedPath(node: Parser.SyntaxNode): number[] {
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

export function followNamedPath(root: Parser.SyntaxNode, path: readonly number[]): Parser.SyntaxNode | null {
  let current: Parser.SyntaxNode | null = root;
  for (const index of path) {
    current = current?.namedChildren[index] ?? null;
  }
  return current;
}
