// ---------------------------------------------------------------------------
// ToolContext — shared dependencies injected into every tool handler
// ---------------------------------------------------------------------------
import type { JsonObject } from "../contracts/json-object.js";
import type { ObservationCache } from "./cache.js";
import type { Metrics } from "./metrics.js";
import type { GovernorTracker } from "../session/tracker.js";
import type { McpToolResult } from "./receipt.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { JsonCodec } from "../ports/codec.js";
import type { ProcessRunner } from "../ports/process-runner.js";
import type { GitClient } from "../ports/git.js";
import type { WarpHandle } from "../ports/warp.js";
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

export type ToolHandler = (args: JsonObject, ctx: ToolContext) => McpToolResult | Promise<McpToolResult>;

export interface ToolDefinition {
  readonly name: McpToolName;
  readonly description: string;
  readonly schema?: Record<string, z.ZodType>;
  readonly policyCheck?: boolean;
  readonly createHandler: () => ToolHandler;
}

// -- Port dependencies ---------------------------------------------------

/** Environment ports — the hex boundary contracts that tools depend on. */
export interface ToolContextPorts {
  readonly fs: FileSystem;
  readonly codec: JsonCodec;
  readonly process: ProcessRunner;
  readonly git: GitClient;
}

// -- Governance and observability -------------------------------------------

/** Governance state — budget, depth, tripwires — visible to every tool handler. */
export interface ToolContextGovernance {
  readonly projectRoot: string;
  readonly graftDir: string;
  readonly graftignorePatterns: readonly string[];
  readonly governor: GovernorTracker;
  readonly cache: ObservationCache;
  readonly metrics: Metrics;
  readonly runCapture: RunCaptureConfig;
  readonly observability: RuntimeObservabilityState;
}

// -- Full context --------------------------------------------------------

/**
 * Aggregate dependency bag injected into every tool handler.
 *
 * Composed of three concerns:
 *   1. Port dependencies — environment adapters (fs, codec, git, process)
 *   2. Governance state — budget tracking, depth, tripwires, caching, observability
 *   3. Operations — methods that execute workspace/daemon actions
 */
export interface ToolContext extends ToolContextPorts, ToolContextGovernance {
  // -- Response helpers --------------------------------------------------
  respond(tool: McpToolName, data: JsonObject): McpToolResult;
  resolvePath(relative: string): string;

  // -- Footprint recording -----------------------------------------------
  /** Record path/symbol/region observations for provenance tracking. */
  recordFootprint(entry: {
    readonly paths?: readonly string[];
    readonly symbols?: readonly string[];
    readonly regions?: readonly ToolCallFootprintRegion[];
  }): void;

  // -- Repo-local workspace operations -----------------------------------
  getWarp(): Promise<WarpHandle>;
  getRepoState(): RepoObservation;
  getCausalContext(): RuntimeCausalContext;
  getWorkspaceOverlayFooting(): Promise<RuntimeWorkspaceOverlayFooting | null>;
  getPersistedLocalHistorySummary(): Promise<PersistedLocalHistorySummary>;
  getPersistedLocalActivityWindow(limit: number): Promise<PersistedLocalActivityWindow>;
  getRepoConcurrencySummary(): Promise<RepoConcurrencySummary | null>;
  declareCausalAttach(request: PersistedLocalHistoryAttachDeclaration): Promise<CausalAttachResult>;

  // -- Workspace lifecycle -----------------------------------------------
  getWorkspaceStatus(): WorkspaceStatus;
  bindWorkspace(request: WorkspaceBindRequest, actionName: string): Promise<WorkspaceActionResult>;
  rebindWorkspace(request: WorkspaceBindRequest, actionName: string): Promise<WorkspaceActionResult>;

  // -- Daemon-scoped operations ------------------------------------------
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

// -- Runtime guard -------------------------------------------------------

const REQUIRED_PORTS = ["fs", "codec", "process", "git"] as const;
const REQUIRED_GOVERNANCE = [
  "projectRoot", "graftDir", "graftignorePatterns",
  "governor", "cache", "metrics", "runCapture", "observability",
] as const;
const REQUIRED_METHODS = [
  "respond", "resolvePath", "getWarp", "getRepoState",
  "getCausalContext", "getWorkspaceStatus",
] as const;

/**
 * Validate that an object satisfies the ToolContext contract at runtime.
 * Call at the wiring boundary (server.ts) to catch broken composition early.
 */
export function assertToolContext(impl: unknown): asserts impl is ToolContext {
  if (impl === null || typeof impl !== "object") {
    throw new TypeError(
      `ToolContext must be an object (got ${impl === null ? "null" : typeof impl})`,
    );
  }
  const obj = impl as Record<string, unknown>;
  for (const key of REQUIRED_PORTS) {
    if (obj[key] === undefined || obj[key] === null) {
      throw new TypeError(`ToolContext missing port: ${key}`);
    }
  }
  for (const key of REQUIRED_GOVERNANCE) {
    if (obj[key] === undefined) {
      throw new TypeError(`ToolContext missing governance property: ${key}`);
    }
  }
  for (const key of REQUIRED_METHODS) {
    if (typeof obj[key] !== "function") {
      throw new TypeError(
        `ToolContext missing method: ${key} (got ${typeof obj[key]})`,
      );
    }
  }
}
