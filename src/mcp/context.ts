// ---------------------------------------------------------------------------
// ToolContext — shared dependencies injected into every tool handler
// ---------------------------------------------------------------------------

import * as path from "node:path";
import type { ObservationCache } from "./cache.js";
import type { Metrics } from "./metrics.js";
import type { SessionTracker } from "../session/tracker.js";
import type { McpToolResult } from "./receipt.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { JsonCodec } from "../ports/codec.js";
import type { ProcessRunner } from "../ports/process-runner.js";
import type { GitClient } from "../ports/git.js";
import type WarpApp from "@git-stunts/git-warp";
import type { RepoObservation } from "./repo-state.js";
import type { RunCaptureConfig } from "./run-capture-config.js";
import type { RuntimeObservabilityState } from "./runtime-observability.js";
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

export type ToolHandler = (args: Record<string, unknown>) => McpToolResult | Promise<McpToolResult>;

export interface ToolDefinition {
  readonly name: McpToolName;
  readonly description: string;
  readonly schema?: Record<string, z.ZodType>;
  readonly policyCheck?: boolean;
  readonly createHandler: (ctx: ToolContext) => ToolHandler;
}

export interface ToolContext {
  readonly projectRoot: string;
  readonly graftDir: string;
  readonly graftignorePatterns: readonly string[];
  readonly session: SessionTracker;
  readonly cache: ObservationCache;
  readonly metrics: Metrics;
  readonly fs: FileSystem;
  readonly codec: JsonCodec;
  readonly process: ProcessRunner;
  readonly git: GitClient;
  readonly runCapture: RunCaptureConfig;
  readonly observability: RuntimeObservabilityState;
  respond(tool: McpToolName, data: Record<string, unknown>): McpToolResult;
  resolvePath(relative: string): string;
  getWarp(): Promise<WarpApp>;
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

export { createPathResolver };
function createPathResolver(projectRoot: string): (input: string) => string {
  return (input: string): string => {
    if (path.isAbsolute(input)) return input;
    const resolved = path.resolve(projectRoot, input);
    const rel = path.relative(projectRoot, resolved);
    if (rel.startsWith("..")) {
      throw new Error(`Path traversal blocked: ${input}`);
    }
    return resolved;
  };
}
