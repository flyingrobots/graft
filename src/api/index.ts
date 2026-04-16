import { startDaemonServer } from "../mcp/daemon-server.js";
import { MCP_TOOL_NAMES } from "../contracts/capabilities.js";
import { createGraftServer } from "../mcp/server.js";
import { startStdioServer } from "../mcp/stdio-server.js";
import { ObservationCache } from "../operations/observation-cache.js";
import { RepoWorkspace } from "../operations/repo-workspace.js";
import { StructuredBuffer } from "../operations/structured-buffer.js";
import type { BufferRange, WarmProjectionBasis, WarmProjectionBundleResult } from "../operations/structured-buffer.js";
import { GRAFT_VERSION } from "../version.js";
export { createRepoLocalGraft, type CreateRepoLocalGraftOptions } from "./repo-local-graft.js";
export { createRepoWorkspace, type CreateRepoWorkspaceOptions } from "./repo-workspace.js";
export { callGraftTool, parseGraftToolPayload } from "./tool-bridge.js";

export interface CreateStructuredBufferOptions {
  readonly basis?: WarmProjectionBasis | undefined;
}

export interface CreateProjectionBundleOptions extends CreateStructuredBufferOptions {
  readonly viewport?: BufferRange | undefined;
}

export function createStructuredBuffer(
  path: string,
  content: string,
  options: CreateStructuredBufferOptions = {},
): StructuredBuffer {
  return new StructuredBuffer({ path, content, basis: options.basis });
}

export function createProjectionBundle(
  path: string,
  content: string,
  options: CreateProjectionBundleOptions = {},
): WarmProjectionBundleResult {
  const buffer = new StructuredBuffer({ path, content, basis: options.basis });
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
