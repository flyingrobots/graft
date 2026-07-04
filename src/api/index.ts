import { startDaemonServer } from "../mcp/daemon-server.js";
import { MCP_TOOL_NAMES } from "../contracts/capabilities.js";
import { createGraftServer } from "../mcp/server.js";
import { startStdioServer } from "../mcp/stdio-server.js";
import { ObservationCache } from "../operations/observation-cache.js";
import { RepoWorkspace } from "../operations/repo-workspace.js";
import { StructuredBuffer } from "../operations/structured-buffer.js";
import type { BufferRange, WarmProjectionBasis, WarmProjectionBundleResult } from "../operations/structured-buffer.js";
import {
  COLORFUL_CLI_MINIMUM_VERSION,
  createColorfulCliProseProjector,
} from "../adapters/colorful-cli-prose-projector.js";
import type { ProseProjectionProvider } from "../operations/colorful-prose-projection.js";
import { createEdictCliProjectionProvider } from "../adapters/edict-cli-projection-provider.js";
import { EdictProjectionError } from "../operations/edict-projection.js";
import type { EdictProjectionProvider } from "../operations/edict-projection.js";
import {
  ProjectionProviderRegistryError,
  createProjectionProviderRegistry,
} from "../operations/projection-provider-registry.js";
import type { ProjectionProviderRegistry } from "../operations/projection-provider-registry.js";
import {
  ProjectionProfileResolverError,
  createProjectionProfileResolver,
} from "../operations/projection-profile-resolver.js";
import type { ProjectionProfileResolver } from "../operations/projection-profile-resolver.js";
import { GRAFT_VERSION } from "../version.js";
export {
  GRAFT_MINIMUM_GIT_VERSION,
  ensureGitVersionSupportsGraft,
} from "../git/version-guard.js";
export { ensureParserReady, isParserReady } from "../parser/runtime.js";
export { createRepoLocalGraft, type CreateRepoLocalGraftOptions } from "./repo-local-graft.js";
export { createRepoWorkspace, type CreateRepoWorkspaceOptions } from "./repo-workspace.js";
export { callGraftTool, parseGraftToolPayload } from "./tool-bridge.js";
export type { GitVersion, GitVersionGuardOptions } from "../git/version-guard.js";

export interface CreateStructuredBufferOptions {
  readonly language?: string | undefined;
  readonly profile?: string | null | undefined;
  readonly basis?: WarmProjectionBasis | undefined;
  readonly proseProjector?: ProseProjectionProvider | undefined;
  readonly edictProjector?: EdictProjectionProvider | undefined;
  readonly projectionRegistry?: ProjectionProviderRegistry | undefined;
  readonly projectionProfileResolver?: ProjectionProfileResolver | undefined;
}

export interface CreateProjectionBundleOptions extends CreateStructuredBufferOptions {
  readonly viewport?: BufferRange | undefined;
}

export function createStructuredBuffer(
  path: string,
  content: string,
  options: CreateStructuredBufferOptions = {},
): StructuredBuffer {
  return new StructuredBuffer({
    path,
    content,
    language: options.language,
    profile: options.profile,
    basis: options.basis,
    proseProjector: options.proseProjector,
    edictProjector: options.edictProjector,
    projectionRegistry: options.projectionRegistry,
    projectionProfileResolver: options.projectionProfileResolver,
  });
}

export function createProjectionBundle(
  path: string,
  content: string,
  options: CreateProjectionBundleOptions = {},
): WarmProjectionBundleResult {
  const buffer = new StructuredBuffer({
    path,
    content,
    language: options.language,
    profile: options.profile,
    basis: options.basis,
    proseProjector: options.proseProjector,
    edictProjector: options.edictProjector,
    projectionRegistry: options.projectionRegistry,
    projectionProfileResolver: options.projectionProfileResolver,
  });
  try {
    return buffer.projectionBundle({ viewport: options.viewport });
  } finally {
    buffer.dispose();
  }
}

export {
  COLORFUL_CLI_MINIMUM_VERSION,
  GRAFT_VERSION,
  MCP_TOOL_NAMES,
  ObservationCache,
  RepoWorkspace,
  StructuredBuffer,
  createColorfulCliProseProjector,
  createEdictCliProjectionProvider,
  createProjectionProfileResolver,
  createProjectionProviderRegistry,
  EdictProjectionError,
  ProjectionProfileResolverError,
  ProjectionProviderRegistryError,
  createGraftServer,
  startDaemonServer,
  startStdioServer,
};

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
  ProjectionProviderBinding,
  ProjectionProviderRegistration,
  ProjectionProviderRegistry,
  ProjectionProviderResolution,
  ProjectionAuthoritySlot,
} from "../operations/structured-buffer.js";

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
} from "../operations/projection-profile-resolver.js";

export type {
  ProseProjection,
  ProseProjectionInput,
  ProseProjectionProvider,
} from "../operations/colorful-prose-projection.js";

export type {
  CreateColorfulCliProseProjectorOptions,
} from "../adapters/colorful-cli-prose-projector.js";

export type {
  CreateEdictCliProjectionProviderOptions,
} from "../adapters/edict-cli-projection-provider.js";

export type {
  StartDaemonServerOptions,
} from "../mcp/daemon-server.js";

export type {
  CreateGraftServerOptions,
  GraftServer,
  McpToolResult,
} from "../mcp/server.js";

export type {
  McpToolName,
} from "../contracts/capabilities.js";

export type {
  RepoWorkspaceChangedSinceResult,
  RepoWorkspaceFileOutlineResult,
  RepoWorkspaceReadRangeResult,
  RepoWorkspaceRefusedResult,
  RepoWorkspaceSafeReadCacheHitResult,
  RepoWorkspaceSafeReadDiffResult,
  RepoWorkspaceSafeReadResult,
} from "../operations/repo-workspace.js";
