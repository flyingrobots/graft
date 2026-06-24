import { startDaemonServer } from "../mcp/daemon-server.js";
import { MCP_TOOL_NAMES } from "../contracts/capabilities.js";
import { createGraftServer } from "../mcp/server.js";
import { startStdioServer } from "../mcp/stdio-server.js";
import { ObservationCache } from "../operations/observation-cache.js";
import { RepoWorkspace } from "../operations/repo-workspace.js";
import { StructuredBuffer } from "../operations/structured-buffer.js";
import type { BufferRange, WarmProjectionBasis, WarmProjectionBundleResult } from "../operations/structured-buffer.js";
import { createColorfulCliProseProjector } from "../adapters/colorful-cli-prose-projector.js";
import type { ProseProjectionProvider } from "../operations/colorful-prose-projection.js";
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
  readonly basis?: WarmProjectionBasis | undefined;
  readonly proseProjector?: ProseProjectionProvider | undefined;
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
    basis: options.basis,
    proseProjector: options.proseProjector,
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
    basis: options.basis,
    proseProjector: options.proseProjector,
  });
  try {
    return buffer.projectionBundle({ viewport: options.viewport });
  } finally {
    buffer.dispose();
  }
}

export {
  GRAFT_VERSION,
  MCP_TOOL_NAMES,
  ObservationCache,
  RepoWorkspace,
  StructuredBuffer,
  createColorfulCliProseProjector,
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
} from "../operations/structured-buffer.js";

export type {
  ProseProjection,
  ProseProjectionInput,
  ProseProjectionProvider,
} from "../operations/colorful-prose-projection.js";

export type {
  CreateColorfulCliProseProjectorOptions,
} from "../adapters/colorful-cli-prose-projector.js";

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
