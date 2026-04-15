import * as path from "node:path";
import { nodeFs } from "./adapters/node-fs.js";
import { CanonicalJsonCodec } from "./adapters/canonical-json.js";
import {
  MCP_TOOL_NAMES,
  type McpToolName,
} from "./contracts/capabilities.js";
import { getMcpOutputSchema } from "./contracts/output-schemas.js";
import { startDaemonServer } from "./mcp/daemon-server.js";
import { createGraftServer, type CreateGraftServerOptions, type GraftServer, type McpToolResult } from "./mcp/server.js";
import { startStdioServer } from "./mcp/stdio-server.js";
import { ObservationCache } from "./operations/observation-cache.js";
import { RepoWorkspace } from "./operations/repo-workspace.js";
import { StructuredBuffer } from "./operations/structured-buffer.js";
import { SessionTracker } from "./session/tracker.js";
import { GRAFT_VERSION } from "./version.js";
import type { JsonCodec } from "./ports/codec.js";
import type { FileSystem } from "./ports/filesystem.js";

export interface CreateRepoLocalGraftOptions extends Omit<CreateGraftServerOptions, "mode" | "projectRoot" | "graftDir"> {
  readonly cwd?: string | undefined;
  readonly graftDir?: string | undefined;
}

export interface CreateRepoWorkspaceOptions {
  readonly cwd?: string | undefined;
  readonly graftignorePatterns?: readonly string[] | undefined;
  readonly fs?: FileSystem | undefined;
  readonly codec?: JsonCodec | undefined;
  readonly session?: SessionTracker | undefined;
  readonly cache?: ObservationCache | undefined;
}

function createLibraryPathResolver(projectRoot: string): (input: string) => string {
  return (input: string): string => {
    if (path.isAbsolute(input)) return input;
    const resolved = path.resolve(projectRoot, input);
    const relative = path.relative(projectRoot, resolved);
    if (relative.startsWith("..")) {
      throw new Error(`Path traversal blocked: ${input}`);
    }
    return resolved;
  };
}

function createLibraryPolicyPathResolver(projectRoot: string): (resolvedPath: string) => string {
  return (resolvedPath: string): string => {
    const relative = path.relative(projectRoot, resolvedPath);
    if (relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)) {
      return resolvedPath;
    }
    return relative.split(path.sep).join("/");
  };
}

export function createRepoLocalGraft(options: CreateRepoLocalGraftOptions = {}): GraftServer {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  return createGraftServer({
    ...options,
    mode: "repo_local",
    projectRoot: cwd,
    graftDir: options.graftDir ?? path.join(cwd, ".graft"),
  });
}

export function createStructuredBuffer(path: string, content: string): StructuredBuffer {
  return new StructuredBuffer({ path, content });
}

export async function createRepoWorkspace(options: CreateRepoWorkspaceOptions = {}): Promise<RepoWorkspace> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const fs = options.fs ?? nodeFs;
  const codec = options.codec ?? new CanonicalJsonCodec();
  return new RepoWorkspace({
    projectRoot: cwd,
    fs,
    codec,
    graftignorePatterns: options.graftignorePatterns ?? await RepoWorkspace.loadGraftignorePatterns(fs, cwd),
    resolvePath: createLibraryPathResolver(cwd),
    toPolicyPath: createLibraryPolicyPathResolver(cwd),
    ...(options.session !== undefined ? { session: options.session } : {}),
    ...(options.cache !== undefined ? { cache: options.cache } : {}),
  });
}

export function parseGraftToolPayload(result: McpToolResult): Record<string, unknown> {
  const payload = result.content.find((item) => item.type === "text");
  if (payload === undefined) {
    throw new Error("Graft tool result did not contain a text payload");
  }
  const parsed = JSON.parse(payload.text) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Graft tool result was not a JSON object");
  }
  return parsed as Record<string, unknown>;
}

export async function callGraftTool<T extends Record<string, unknown> = Record<string, unknown>>(
  graft: GraftServer,
  name: McpToolName,
  args: Record<string, unknown>,
): Promise<T> {
  const parsed = parseGraftToolPayload(await graft.callTool(name, args));
  return getMcpOutputSchema(name).parse(parsed) as T;
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
} from "./operations/structured-buffer.js";

export type {
  StartDaemonServerOptions,
} from "./mcp/daemon-server.js";

export type {
  CreateGraftServerOptions,
  GraftServer,
  McpToolResult,
} from "./mcp/server.js";

export type {
  McpToolName,
} from "./contracts/capabilities.js";

export type {
  RepoWorkspaceChangedSinceResult,
  RepoWorkspaceFileOutlineResult,
  RepoWorkspaceReadRangeResult,
  RepoWorkspaceRefusedResult,
  RepoWorkspaceSafeReadCacheHitResult,
  RepoWorkspaceSafeReadDiffResult,
  RepoWorkspaceSafeReadResult,
} from "./operations/repo-workspace.js";
