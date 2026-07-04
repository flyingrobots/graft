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
  WarmProjectionBundleResult,
  WarmProjectionBasis,
} from "./structured-buffer-model.js";
import type { ProseProjectionProvider } from "./colorful-prose-projection.js";
import type { EdictProjectionBundle, EdictProjectionProvider } from "./edict-projection.js";
import type { WesleyProjectionBundle } from "./wesley-projection.js";
import type { ProjectionProviderRegistry } from "./projection-provider-registry.js";
import type { ProjectionProfileResolver } from "./projection-profile-resolver.js";
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
  buildWarmProjectionBundleResult,
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
  StructuredBufferFormat,
  SymbolOccurrence,
  SymbolOccurrencesResult,
  SyntaxClass,
  SyntaxSpan,
  SyntaxSpanResult,
  WarmProjectionBundleResult,
  WarmProjectionParseStatus,
  WarmProjectionBasis,
  ProjectionAuthoritySlot,
} from "./structured-buffer-model.js";

export { EdictProjectionError } from "./edict-projection.js";
export {
  ProjectionProviderRegistryError,
  createProjectionProviderRegistry,
} from "./projection-provider-registry.js";
export {
  ProjectionProfileResolverError,
  createProjectionProfileResolver,
} from "./projection-profile-resolver.js";

export type {
  EdictCoreProjection,
  EdictDiagnosticItem,
  EdictProjectionBundle,
  EdictProjectionCompilerContext,
  EdictProjectionDiagnostics,
  EdictProjectionEmit,
  EdictProjectionFailure,
  EdictProjectionProvider,
  EdictProjectionRequest,
  EdictProjectionSlot,
  EdictProjectionStatus,
  EdictProjectionTargetSettings,
  EdictTargetIrProjection,
  EdictSyntaxProjection,
} from "./edict-projection.js";

export type {
  WesleyDiagnosticItem,
  WesleyDigestItem,
  WesleyDigestProjection,
  WesleyProjectionBundle,
  WesleyProjectionDiagnostics,
  WesleyProjectionEmit,
  WesleyProjectionFailure,
  WesleyJsonObject,
  WesleyProjectionProvider,
  WesleyProjectionRequest,
  WesleyProjectionSlot,
  WesleyProjectionStatus,
  WesleySyntaxProjection,
} from "./wesley-projection.js";

export type {
  ProjectionProviderBinding,
  ProjectionProviderRegistration,
  ProjectionProviderRegistry,
  ProjectionProviderResolution,
} from "./projection-provider-registry.js";

export type {
  ProjectionAuthorityResolution,
  ProjectionExtensionFallbackInput,
  ProjectionProfileExtension,
  ProjectionProfileExtensionInput,
  ProjectionProfileInput,
  ProjectionProfileResolver,
  ProjectionProfileResolverConfig,
  ProjectionRouteInput,
  ProjectionRoutingFailure,
  ProjectionRoutingFailureKind,
  ResolvedAuthorityContext,
} from "./projection-profile-resolver.js";

export class StructuredBuffer {
  readonly path: string;
  readonly content: string;
  readonly format: StructuredBufferSnapshot["format"];
  readonly basis: WarmProjectionBasis | null;
  readonly partial: boolean;
  #disposed = false;
  #snapshot: StructuredBufferSnapshot;

  constructor(opts: {
    path: string;
    content: string;
    language?: string | undefined;
    profile?: string | null | undefined;
    basis?: WarmProjectionBasis | undefined;
    proseProjector?: ProseProjectionProvider | undefined;
    edictProjector?: EdictProjectionProvider | undefined;
    projectionRegistry?: ProjectionProviderRegistry | undefined;
    projectionProfileResolver?: ProjectionProfileResolver | undefined;
  }) {
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

  projectionBundle(opts: { viewport?: BufferRange | undefined } = {}): WarmProjectionBundleResult {
    this.#assertLive();
    return buildWarmProjectionBundleResult(this.#snapshot, opts);
  }

  edictProjection(): EdictProjectionBundle | null {
    this.#assertLive();
    return this.#snapshot.edictProjection ?? null;
  }

  wesleyProjection(): WesleyProjectionBundle | null {
    this.#assertLive();
    return this.#snapshot.wesleyProjection ?? null;
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
