// ---------------------------------------------------------------------------
// ToolContext — shared dependencies injected into every tool handler
// ---------------------------------------------------------------------------

import * as fs from "node:fs";
import * as path from "node:path";
import type { ObservationCache } from "./cache.js";
import type { Metrics } from "./metrics.js";
import type { GovernorTracker } from "../session/tracker.js";
import type { McpToolResult } from "./receipt.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { JsonCodec } from "../ports/codec.js";
import type { ProcessRunner } from "../ports/process-runner.js";
import type { GitClient } from "../ports/git.js";
import type { WarpContext } from "../warp/context.js";
import type { RepoObservation } from "./repo-state.js";
import type { RunCaptureConfig } from "./run-capture-config.js";
import type { RuntimeObservabilityState, ToolCallFootprintRegion } from "./runtime-observability.js";
import type { RuntimeCausalContext } from "./runtime-causal-context.js";
import type { RuntimeWorkspaceOverlayFooting } from "./runtime-workspace-overlay.js";
import type {
  PersistedLocalActivityWindow,
  PersistedLocalHistoryAttachDeclaration,
  RepoConcurrencySummary,
  PersistedLocalHistorySummary,
} from "./persisted-local-history.js";
import type { McpToolName } from "../contracts/output-schemas.js";
import type {
  DaemonSessionView,
  DaemonStatusView,
  AuthorizedWorkspaceView,
  WorkspaceAuthorizeRequest,
  WorkspaceAuthorizeResult,
  WorkspaceRevokeResult,
} from "./daemon-control-plane.js";
import type {
  DaemonRepoFilter,
  DaemonRepoListView,
} from "./daemon-repos.js";
import type {
  MonitorActionResult,
  MonitorStartRequest,
  MonitorStatusView,
} from "./persistent-monitor-runtime.js";
import type {
  WorkspaceActionResult,
  CausalAttachResult,
  WorkspaceBindRequest,
  WorkspaceStatus,
} from "./workspace-router.js";

import type { z } from "zod";

export type ToolHandler = (args: Record<string, unknown>, ctx: ToolContext) => McpToolResult | Promise<McpToolResult>;

export interface ToolDefinition {
  readonly name: McpToolName;
  readonly description: string;
  readonly schema?: Record<string, z.ZodType>;
  readonly policyCheck?: boolean;
  readonly createHandler: () => ToolHandler;
}

export interface ToolContext {
  readonly projectRoot: string;
  readonly graftDir: string;
  readonly graftignorePatterns: readonly string[];
  readonly governor: GovernorTracker;
  readonly cache: ObservationCache;
  readonly metrics: Metrics;
  readonly fs: FileSystem;
  readonly codec: JsonCodec;
  readonly process: ProcessRunner;
  readonly git: GitClient;
  readonly runCapture: RunCaptureConfig;
  readonly observability: RuntimeObservabilityState;
  respond(tool: McpToolName, data: Record<string, unknown>): McpToolResult;
  recordFootprint(entry: {
    readonly paths?: readonly string[];
    readonly symbols?: readonly string[];
    readonly regions?: readonly ToolCallFootprintRegion[];
  }): void;
  resolvePath(relative: string): string;
  getWarp(): Promise<WarpContext>;
  getRepoState(): RepoObservation;
  getCausalContext(): RuntimeCausalContext;
  getWorkspaceOverlayFooting(): Promise<RuntimeWorkspaceOverlayFooting | null>;
  getPersistedLocalHistorySummary(): Promise<PersistedLocalHistorySummary>;
  getPersistedLocalActivityWindow(limit: number): Promise<PersistedLocalActivityWindow>;
  getRepoConcurrencySummary(): Promise<RepoConcurrencySummary | null>;
  declareCausalAttach(request: PersistedLocalHistoryAttachDeclaration): Promise<CausalAttachResult>;
  getWorkspaceStatus(): WorkspaceStatus;
  bindWorkspace(request: WorkspaceBindRequest, actionName: string): Promise<WorkspaceActionResult>;
  rebindWorkspace(request: WorkspaceBindRequest, actionName: string): Promise<WorkspaceActionResult>;
  getDaemonStatus(): Promise<DaemonStatusView>;
  listDaemonRepos(filter: DaemonRepoFilter): Promise<DaemonRepoListView>;
  listDaemonSessions(): Promise<readonly DaemonSessionView[]>;
  listDaemonMonitors(): Promise<readonly MonitorStatusView[]>;
  startMonitor(request: MonitorStartRequest): Promise<MonitorActionResult>;
  pauseMonitor(request: WorkspaceBindRequest): Promise<MonitorActionResult>;
  resumeMonitor(request: WorkspaceBindRequest): Promise<MonitorActionResult>;
  stopMonitor(request: WorkspaceBindRequest): Promise<MonitorActionResult>;
  listWorkspaceAuthorizations(): Promise<readonly AuthorizedWorkspaceView[]>;
  authorizeWorkspace(request: WorkspaceAuthorizeRequest): Promise<WorkspaceAuthorizeResult>;
  revokeWorkspace(request: WorkspaceBindRequest): Promise<WorkspaceRevokeResult>;
}

/**
 * Resolve a user-provided path against projectRoot with traversal guard.
 * Both absolute and relative paths are confined to the project root.
 * Symlinks are resolved before the confinement check to prevent escapes.
 */
export function createPathResolver(projectRoot: string): (input: string) => string {
  const normalizedRoot = path.resolve(projectRoot);

  // Resolve the project root itself through symlinks for consistent comparison
  let realProjectRoot: string;
  try {
    realProjectRoot = fs.realpathSync(normalizedRoot);
  } catch {
    realProjectRoot = normalizedRoot;
  }

  return (input: string): string => {
    // Resolve: absolute paths are taken as-is, relative paths join to projectRoot
    const resolved = path.isAbsolute(input)
      ? path.resolve(input)
      : path.resolve(normalizedRoot, input);

    // Logical confinement check (catches ".." traversal without needing fs access)
    const logicalRel = path.relative(normalizedRoot, resolved);
    if (logicalRel.startsWith("..") || path.isAbsolute(logicalRel)) {
      throw new Error(`Path traversal blocked: ${input}`);
    }

    // Resolve symlinks before a second confinement check to prevent symlink escapes
    let real: string;
    try {
      real = fs.realpathSync(resolved);
    } catch {
      // Target doesn't exist yet — return the logical path (already passed confinement)
      return resolved;
    }

    // Symlink confinement check: the real path must be within the real project root
    const realRel = path.relative(realProjectRoot, real);
    if (realRel.startsWith("..") || path.isAbsolute(realRel)) {
      throw new Error(`Path traversal blocked: ${input}`);
    }
    return resolved;
  };
}

/**
 * Runtime guard: asserts that the supplied value satisfies the ToolContext
 * shape.  Used at composition-root boundaries to catch wiring errors early.
 */
export function assertToolContext(value: unknown): asserts value is ToolContext {
  if (value === null || typeof value !== "object") {
    throw new Error("ToolContext must be an object");
  }
  const obj = value as Record<string, unknown>;

  const ports = ["fs", "codec", "process", "git"] as const;
  for (const port of ports) {
    if (obj[port] === undefined || obj[port] === null) {
      throw new Error(`ToolContext missing port: ${port}`);
    }
  }

  const governanceProps = ["governor", "cache", "metrics"] as const;
  for (const prop of governanceProps) {
    if (obj[prop] === undefined || obj[prop] === null) {
      throw new Error(`ToolContext missing governance property: ${prop}`);
    }
  }

  const methods = ["respond", "resolvePath", "getWarp", "getRepoState", "getCausalContext", "getWorkspaceStatus"] as const;
  for (const method of methods) {
    if (obj[method] === undefined || obj[method] === null) {
      throw new Error(`ToolContext missing method: ${method}`);
    }
    if (typeof obj[method] !== "function") {
      throw new Error(`ToolContext missing method: ${method} (got ${typeof obj[method]})`);
    }
  }
}
