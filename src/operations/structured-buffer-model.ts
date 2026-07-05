import type Parser from "web-tree-sitter";
import { detectStructuredFormat, isSupportedLang } from "../parser/lang.js";
import type { SupportedStructuredFormat } from "../parser/lang.js";
import type { OutlineDiff } from "../parser/diff.js";
import {
  ParserRuntimeNotReadyError,
  ensureParserReady,
  parseStructuredTreeForFile,
} from "../parser/runtime.js";
import type { ParsedTree } from "../parser/runtime.js";
import type { OutlineEntry, JumpEntry } from "../parser/types.js";
import type { ProseProjection, ProseProjectionProvider } from "./colorful-prose-projection.js";
import { isEdictPath } from "./edict-projection.js";
import type {
  EdictEchoReceiptProjection,
  EdictProjectionBundle,
  EdictProjectionProvider,
  EdictProjectionSlot,
} from "./edict-projection.js";
import type { ProjectionProviderRegistry } from "./projection-provider-registry.js";
import type {
  ProjectionProfileResolver,
  ProjectionRoutingFailure,
  ResolvedAuthorityContext,
} from "./projection-profile-resolver.js";
import type { WesleyProjectionBundle } from "./wesley-projection.js";

const EDICT_ECHO_RECEIPT_NOT_REQUESTED: EdictProjectionSlot<EdictEchoReceiptProjection> =
  Object.freeze({ state: "not_requested" as const });

export type BufferUnavailableReason =
  | "UNSUPPORTED_LANGUAGE"
  | "PARSER_RUNTIME_NOT_READY"
  | "PROJECTION_AUTHORITY_UNAVAILABLE"
  | "PROJECTION_PROVIDER_UNAVAILABLE";

export type StructuredBufferFormat = SupportedStructuredFormat | "prose" | "edict";

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
  readonly format: StructuredBufferFormat | null;
  readonly basis: WarmProjectionBasis | null;
  readonly outline: readonly OutlineEntry[];
  readonly jumpTable: readonly JumpEntry[];
  readonly partial: boolean;
  readonly reason?: BufferUnavailableReason | undefined;
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
  readonly format: StructuredBufferFormat | null;
  readonly basis: WarmProjectionBasis | null;
  readonly partial: boolean;
  readonly spans: readonly SyntaxSpan[];
  readonly injections: readonly InjectionRegion[];
  readonly reason?: BufferUnavailableReason | undefined;
}

export interface BufferDiagnostic {
  readonly severity: "error" | "warning";
  readonly code: "parse_error" | "missing_node" | "compiler_diagnostic";
  readonly message: string;
  readonly range: BufferRange;
  readonly source?: "tree_sitter" | "edict" | "wesley" | undefined;
  readonly stage?: string | undefined;
  readonly kind?: string | undefined;
}

export interface DiagnosticsResult {
  readonly path: string;
  readonly format: StructuredBufferFormat | null;
  readonly basis: WarmProjectionBasis | null;
  readonly partial: boolean;
  readonly diagnostics: readonly BufferDiagnostic[];
  readonly reason?: BufferUnavailableReason | undefined;
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
  readonly format: StructuredBufferFormat | null;
  readonly basis: WarmProjectionBasis | null;
  readonly partial: boolean;
  readonly node: NodeSummary | null;
  readonly parents: readonly NodeSummary[];
  readonly reason?: BufferUnavailableReason | undefined;
}

export interface InjectionRegion {
  readonly language: string;
  readonly range: BufferRange;
  readonly reason: "fenced_code_block" | "jsx_syntax" | "tagged_template";
  readonly hint?: string | undefined;
}

export interface InjectionResult {
  readonly path: string;
  readonly format: StructuredBufferFormat | null;
  readonly basis: WarmProjectionBasis | null;
  readonly injections: readonly InjectionRegion[];
  readonly reason?: BufferUnavailableReason | undefined;
}

export interface FoldRegion {
  readonly kind: string;
  readonly range: BufferRange;
}

export interface FoldRegionsResult {
  readonly path: string;
  readonly format: StructuredBufferFormat | null;
  readonly basis: WarmProjectionBasis | null;
  readonly partial: boolean;
  readonly regions: readonly FoldRegion[];
  readonly reason?: BufferUnavailableReason | undefined;
}

export interface WarmProjectionParseStatus {
  readonly basis: WarmProjectionBasis | null;
  readonly format: StructuredBufferFormat | null;
  readonly partial: boolean;
  readonly status: "full" | "partial" | "unsupported";
  readonly reason?: BufferUnavailableReason | undefined;
}

export type ProjectionAuthoritySlot =
  | { readonly state: "not_configured" }
  | {
      readonly state: "resolved";
      readonly authority: ResolvedAuthorityContext;
    }
  | {
      readonly state: "failed";
      readonly failure: ProjectionRoutingFailure;
    };

export interface WarmProjectionBundleResult {
  readonly path: string;
  readonly format: StructuredBufferFormat | null;
  readonly basis: WarmProjectionBasis | null;
  readonly partial: boolean;
  readonly authority: ProjectionAuthoritySlot;
  readonly parseStatus: WarmProjectionParseStatus;
  readonly syntax: SyntaxSpanResult;
  readonly diagnostics: DiagnosticsResult;
  readonly folds: FoldRegionsResult;
  readonly outline: BufferOutlineResult;
}

export interface SelectionStepResult {
  readonly path: string;
  readonly format: StructuredBufferFormat | null;
  readonly basis: WarmProjectionBasis | null;
  readonly partial: boolean;
  readonly range: BufferRange | null;
  readonly node: NodeSummary | null;
  readonly reason?: BufferUnavailableReason | "NO_SELECTION_STEP" | undefined;
}

export interface SymbolOccurrence {
  readonly symbol: string;
  readonly kind: "declaration" | "occurrence";
  readonly range: BufferRange;
}

export interface SymbolOccurrencesResult {
  readonly path: string;
  readonly format: StructuredBufferFormat | null;
  readonly basis: WarmProjectionBasis | null;
  readonly partial: boolean;
  readonly symbol: string | null;
  readonly occurrences: readonly SymbolOccurrence[];
  readonly scopeApplied: "buffer";
  readonly reason?: BufferUnavailableReason | "SYMBOL_NOT_FOUND" | undefined;
}

export interface RenameEditPreview {
  readonly path: string;
  readonly range: BufferRange;
  readonly before: string;
  readonly after: string;
}

export interface RenamePreviewResult {
  readonly path: string;
  readonly format: StructuredBufferFormat | null;
  readonly basis: WarmProjectionBasis | null;
  readonly partial: boolean;
  readonly symbol: string | null;
  readonly nextName: string;
  readonly edits: readonly RenameEditPreview[];
  readonly scopeApplied: "buffer";
  readonly reason?: BufferUnavailableReason | "SYMBOL_NOT_FOUND" | undefined;
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
  readonly format: StructuredBufferFormat | null;
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
  readonly format: StructuredBufferFormat | null;
  readonly fromBasis: WarmProjectionBasis | null;
  readonly toBasis: WarmProjectionBasis | null;
  readonly partial: boolean;
  readonly kind: SemanticSummaryKind;
  readonly summary: string;
  readonly facts: readonly string[];
}

export interface AnchorAffinityResult {
  readonly path: string;
  readonly format: StructuredBufferFormat | null;
  readonly fromBasis: WarmProjectionBasis | null;
  readonly toBasis: WarmProjectionBasis | null;
  readonly partial: boolean;
  readonly oldRange: BufferRange;
  readonly newRange: BufferRange | null;
  readonly status: "mapped" | "lost";
  readonly strategy: "named_path" | "named_search" | "text_search" | "none";
  readonly confidence: "high" | "medium" | "low";
  readonly reason?: BufferUnavailableReason | "ANCHOR_NOT_FOUND" | undefined;
}

export interface StructuredBufferSnapshot {
  readonly path: string;
  readonly content: string;
  readonly format: StructuredBufferFormat | null;
  readonly basis: WarmProjectionBasis | null;
  readonly partial: boolean;
  readonly parsed: ParsedTree | null;
  readonly authority: ProjectionAuthoritySlot;
  readonly proseProjection?: ProseProjection | undefined;
  readonly edictProjection?: EdictProjectionBundle | undefined;
  readonly wesleyProjection?: WesleyProjectionBundle | undefined;
  readonly parseUnavailableReason?: BufferUnavailableReason | undefined;
}

export function createStructuredBufferSnapshot(opts: {
  path: string;
  content: string;
  language?: string | undefined;
  profile?: string | null | undefined;
  basis?: WarmProjectionBasis | undefined;
  proseProjector?: ProseProjectionProvider | undefined;
  edictProjector?: EdictProjectionProvider | undefined;
  projectionRegistry?: ProjectionProviderRegistry | undefined;
  projectionProfileResolver?: ProjectionProfileResolver | undefined;
}): StructuredBufferSnapshot {
  const requestedLanguage = normalizeProjectionLanguage(opts.language);
  const authority = resolveAuthority({
    path: opts.path,
    language: requestedLanguage,
    profile: opts.profile,
    projectionProfileResolver: opts.projectionProfileResolver,
  });
  if (authority.state === "failed" && authority.failure.kind !== "no_provider") {
    const requestedLanguageId = requestedLanguage?.toLowerCase();
    return {
      path: opts.path,
      content: opts.content,
      format: isEdictPath(opts.path) || requestedLanguageId === "edict"
        ? "edict"
        : detectStructuredFormat(opts.path),
      basis: opts.basis ?? null,
      partial: true,
      parsed: null,
      authority,
      parseUnavailableReason: "PROJECTION_AUTHORITY_UNAVAILABLE",
    };
  }

  const providerLanguage = authority.state === "resolved"
    ? authority.authority.language
    : requestedLanguage;
  const providerInvocationAllowed = authority.state !== "failed";
  const projectionProvider = providerInvocationAllowed ? opts.projectionRegistry?.resolve({
    path: opts.path,
    language: providerLanguage,
  }) ?? null : null;
  const matchedProjectionProvider = authority.state === "resolved"
    && projectionProvider !== null
    && projectionProvider.provider.kind !== authority.authority.provider
    ? null
    : projectionProvider;
  if (
    authority.state === "resolved"
    && matchedProjectionProvider === null
    && !(authority.authority.language === "edict" && opts.edictProjector !== undefined)
  ) {
    return {
      path: opts.path,
      content: opts.content,
      format: detectStructuredFormat(opts.path),
      basis: opts.basis ?? null,
      partial: true,
      parsed: null,
      authority,
      parseUnavailableReason: "PROJECTION_PROVIDER_UNAVAILABLE",
    };
  }
  const requestedLanguageId = providerLanguage?.toLowerCase();
  const registryEdictProjector = matchedProjectionProvider?.provider.kind === "edict"
    ? matchedProjectionProvider.provider.provider
    : undefined;
  const registryWesleyProjector = matchedProjectionProvider?.provider.kind === "wesley"
    ? matchedProjectionProvider.provider.provider
    : undefined;
  const wesleyRequested = requestedLanguageId === "wesley-sdl"
    || matchedProjectionProvider?.provider.kind === "wesley";
  const edictRequested = isEdictPath(opts.path)
    || requestedLanguageId === "edict"
    || matchedProjectionProvider?.provider.kind === "edict";
  const edictProjector = providerInvocationAllowed ? opts.edictProjector ?? registryEdictProjector : undefined;
  const format = edictRequested ? "edict" : wesleyRequested ? "graphql" : detectStructuredFormat(opts.path);
  let parsed: ParsedTree | null = null;
  let parseUnavailableReason: BufferUnavailableReason | undefined;
  const proseProjection = edictRequested || wesleyRequested || !providerInvocationAllowed
    ? undefined
    : opts.proseProjector?.project({ path: opts.path, content: opts.content }) ?? undefined;
  let edictProjection: EdictProjectionBundle | undefined;
  let wesleyProjection: WesleyProjectionBundle | undefined;
  if (edictRequested && authority.state === "failed") {
    parseUnavailableReason = "PROJECTION_AUTHORITY_UNAVAILABLE";
  } else if (edictRequested && edictProjector !== undefined) {
    try {
      edictProjection = normalizeEdictProjectionBundle(edictProjector.project({
        name: opts.path,
        content: opts.content,
        basis: opts.basis,
        emit: ["syntax", "diagnostics", "core", "targetIr"],
        ...(authority.state === "resolved" ? { authority: authority.authority } : {}),
      }));
    } catch {
      parseUnavailableReason = "PROJECTION_PROVIDER_UNAVAILABLE";
    }
  }
  if (edictRequested && authority.state === "failed") {
    // Authority failure already selected the stable unavailability reason.
  } else if (edictRequested && edictProjection === undefined) {
    parseUnavailableReason = "PROJECTION_PROVIDER_UNAVAILABLE";
  } else if (wesleyRequested && authority.state !== "resolved") {
    parseUnavailableReason = "PROJECTION_AUTHORITY_UNAVAILABLE";
  } else if (wesleyRequested && registryWesleyProjector !== undefined && authority.state === "resolved") {
    try {
      wesleyProjection = registryWesleyProjector.project({
        name: opts.path,
        content: opts.content,
        basis: opts.basis,
        authority: authority.authority,
        emit: ["syntax", "diagnostics", "digests", "payloads"],
      });
    } catch {
      parseUnavailableReason = "PROJECTION_PROVIDER_UNAVAILABLE";
    }
    if (wesleyProjection === undefined) {
      parseUnavailableReason = "PROJECTION_PROVIDER_UNAVAILABLE";
    }
  } else if (proseProjection === undefined && edictProjection === undefined && format === null) {
    parseUnavailableReason = "UNSUPPORTED_LANGUAGE";
  } else if (
    proseProjection === undefined
    && edictProjection === undefined
    && parseUnavailableReason === undefined
    && format !== null
    && isSupportedLang(format)
  ) {
    try {
      parsed = parseStructuredTreeForFile(opts.path, opts.content);
    } catch (error) {
      if (error instanceof ParserRuntimeNotReadyError) {
        parseUnavailableReason = "PARSER_RUNTIME_NOT_READY";
        void ensureParserReady().catch(() => {
          // Best-effort warmup: snapshot already reports parser unavailability.
        });
      } else {
        throw error;
      }
    }
  }

  return {
    path: opts.path,
    content: opts.content,
    format: edictProjection !== undefined ? "edict" : proseProjection?.format ?? format,
    basis: opts.basis ?? null,
    partial: edictProjection !== undefined
      ? edictProjection.syntax.state === "blocked"
        || edictProjection.syntax.state === "failed"
        || edictProjection.diagnostics.items.length > 0
        || edictProjection.core.state === "blocked"
        || edictProjection.core.state === "failed"
        || edictProjection.targetIr.state === "blocked"
        || edictProjection.targetIr.state === "failed"
        || edictEchoReceiptSlot(edictProjection).state === "blocked"
        || edictEchoReceiptSlot(edictProjection).state === "failed"
      : wesleyProjection !== undefined
        ? wesleyProjection.syntax.state === "blocked"
          || wesleyProjection.syntax.state === "failed"
          || wesleyProjection.diagnostics.items.length > 0
          || wesleyProjection.digests.state === "blocked"
          || wesleyProjection.digests.state === "failed"
          || wesleyProjection.status.status === "error"
          || wesleyProjection.status.errors > 0
          || Object.values(wesleyProjection.payloads).some((slot) =>
            slot.state === "blocked" || slot.state === "failed"
          )
      : proseProjection?.partial ?? (
        (parsed?.root.hasError() ?? false)
        || parseUnavailableReason === "PARSER_RUNTIME_NOT_READY"
        || parseUnavailableReason === "PROJECTION_AUTHORITY_UNAVAILABLE"
      ),
    parsed,
    authority,
    ...(proseProjection !== undefined ? { proseProjection } : {}),
    ...(edictProjection !== undefined ? { edictProjection } : {}),
    ...(wesleyProjection !== undefined ? { wesleyProjection } : {}),
    ...(parseUnavailableReason !== undefined ? { parseUnavailableReason } : {}),
  };
}

function normalizeEdictProjectionBundle(bundle: EdictProjectionBundle): EdictProjectionBundle {
  return bundle.echoReceipt === undefined
    ? { ...bundle, echoReceipt: EDICT_ECHO_RECEIPT_NOT_REQUESTED }
    : bundle;
}

function edictEchoReceiptSlot(bundle: EdictProjectionBundle): EdictProjectionSlot<EdictEchoReceiptProjection> {
  return bundle.echoReceipt ?? EDICT_ECHO_RECEIPT_NOT_REQUESTED;
}

function resolveAuthority(opts: {
  readonly path: string;
  readonly language?: string | undefined;
  readonly profile?: string | null | undefined;
  readonly projectionProfileResolver?: ProjectionProfileResolver | undefined;
}): ProjectionAuthoritySlot {
  const resolver = opts.projectionProfileResolver;
  if (resolver === undefined) {
    return { state: "not_configured" };
  }
  return resolver.resolve({
    path: opts.path,
    language: opts.language,
    profile: opts.profile,
  });
}

function normalizeProjectionLanguage(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
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
