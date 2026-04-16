import type {
  AnchorAffinityResult,
  BufferOutlineResult,
  BufferPoint,
  BufferRange,
  BufferSelection,
  DiagnosticsResult,
  FoldRegionsResult,
  InjectionResult,
  NodeLookupResult,
  RenamePreviewResult,
  SelectionStepResult,
  SemanticSummaryResult,
  StructuredBufferSnapshot,
  StructuredBufferDiffResult,
  SymbolOccurrencesResult,
  SyntaxSpanResult,
  WarmProjectionBasis,
} from "./structured-buffer-model.js";
import { createStructuredBufferSnapshot } from "./structured-buffer-model.js";
import {
  buildDiagnosticsResult,
  buildFoldRegionsResult,
  buildInjectionResult,
  buildNodeLookupResult,
  buildOutlineResult,
  buildRenamePreviewResult,
  buildSelectionExpandResult,
  buildSelectionShrinkResult,
  buildSymbolOccurrencesResult,
  buildSyntaxSpansResult,
} from "./structured-buffer-query.js";
import {
  buildAnchorAffinityResult,
  buildDiffResult,
  buildSemanticSummaryResult,
} from "./structured-buffer-compare.js";

export type {
  AnchorAffinityResult,
  BufferDiagnostic,
  BufferOutlineResult,
  BufferPoint,
  BufferRange,
  BufferSelection,
  ChangedRegion,
  DiagnosticsResult,
  FoldRegion,
  FoldRegionsResult,
  InjectionRegion,
  InjectionResult,
  NodeLookupResult,
  NodeSummary,
  RenameEditPreview,
  RenamePreviewResult,
  SelectionStepResult,
  SemanticSummaryKind,
  SemanticSummaryResult,
  StructuredBufferDiffResult,
  SymbolOccurrence,
  SymbolOccurrencesResult,
  SyntaxClass,
  SyntaxSpan,
  SyntaxSpanResult,
  WarmProjectionBasis,
} from "./structured-buffer-model.js";

export class StructuredBuffer {
  readonly path: string;
  readonly content: string;
  readonly format: StructuredBufferSnapshot["format"];
  readonly basis: WarmProjectionBasis | null;
  readonly partial: boolean;
  #disposed = false;
  #snapshot: StructuredBufferSnapshot;

  constructor(opts: { path: string; content: string; basis?: WarmProjectionBasis | undefined }) {
    this.#snapshot = createStructuredBufferSnapshot(opts);
    this.path = this.#snapshot.path;
    this.content = this.#snapshot.content;
    this.format = this.#snapshot.format;
    this.basis = this.#snapshot.basis;
    this.partial = this.#snapshot.partial;
  }

  dispose(): void {
    if (this.#disposed) {
      return;
    }
    this.#snapshot.parsed?.delete();
    this.#disposed = true;
  }

  basisIdentity(): WarmProjectionBasis | null {
    this.#assertLive();
    return this.basis;
  }

  outline(): BufferOutlineResult {
    this.#assertLive();
    return buildOutlineResult(this.#snapshot);
  }

  syntaxSpans(opts: { viewport?: BufferRange | undefined } = {}): SyntaxSpanResult {
    this.#assertLive();
    return buildSyntaxSpansResult(this.#snapshot, opts);
  }

  diagnostics(): DiagnosticsResult {
    this.#assertLive();
    return buildDiagnosticsResult(this.#snapshot);
  }

  nodeAt(position: BufferPoint): NodeLookupResult {
    this.#assertLive();
    return buildNodeLookupResult(this.#snapshot, position);
  }

  injections(): InjectionResult {
    this.#assertLive();
    return buildInjectionResult(this.#snapshot);
  }

  foldRegions(): FoldRegionsResult {
    this.#assertLive();
    return buildFoldRegionsResult(this.#snapshot);
  }

  selectionExpand(selection: BufferSelection): SelectionStepResult {
    this.#assertLive();
    return buildSelectionExpandResult(this.#snapshot, selection);
  }

  selectionShrink(selection: BufferRange): SelectionStepResult {
    this.#assertLive();
    return buildSelectionShrinkResult(this.#snapshot, selection);
  }

  symbolOccurrences(opts: { position?: BufferPoint | undefined; symbol?: string | undefined } = {}): SymbolOccurrencesResult {
    this.#assertLive();
    return buildSymbolOccurrencesResult(this.#snapshot, opts);
  }

  renamePreview(opts: { nextName: string; position?: BufferPoint | undefined; symbol?: string | undefined }): RenamePreviewResult {
    this.#assertLive();
    return buildRenamePreviewResult(this.#snapshot, opts);
  }

  diff(next: StructuredBuffer): StructuredBufferDiffResult {
    this.#assertLive();
    next.#assertLive();
    return buildDiffResult(this.#snapshot, next.#snapshot);
  }

  semanticSummary(next: StructuredBuffer): SemanticSummaryResult {
    this.#assertLive();
    next.#assertLive();
    return buildSemanticSummaryResult(this.#snapshot, next.#snapshot);
  }

  mapRangeTo(next: StructuredBuffer, selection: BufferRange): AnchorAffinityResult {
    this.#assertLive();
    next.#assertLive();
    return buildAnchorAffinityResult(this.#snapshot, next.#snapshot, selection);
  }

  #assertLive(): void {
    if (this.#disposed) {
      throw new Error("StructuredBuffer has been disposed");
    }
  }
}
