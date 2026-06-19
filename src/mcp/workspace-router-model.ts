import type { ObservationCache } from "./cache.js";
import type { Metrics } from "./metrics.js";
import type { RepoStateTracker } from "./repo-state.js";
import type { RuntimeCausalContext } from "./runtime-causal-context.js";
import type { PersistedLocalHistorySummary } from "./persisted-local-history.js";
import type { GovernorTracker } from "../session/tracker.js";
import type { WarpContext } from "../warp/context.js";

export type WorkspaceMode = "repo_local" | "daemon";
export type WorkspaceBindState = "bound" | "unbound";
export type WorkspaceBindAction = "bind" | "rebind";

export interface WorkspaceCapabilityProfile {
  readonly boundedReads: boolean;
  readonly structuralTools: boolean;
  readonly precisionTools: boolean;
  readonly stateBookmarks: boolean;
  readonly runtimeLogs: "session_local_only";
  readonly runCapture: boolean;
}

export interface WorkspaceStatus {
  readonly sessionMode: WorkspaceMode;
  readonly bindState: WorkspaceBindState;
  readonly repoId: string | null;
  readonly worktreeId: string | null;
  readonly worktreeRoot: string | null;
  readonly gitCommonDir: string | null;
  readonly graftDir: string | null;
  readonly capabilityProfile: WorkspaceCapabilityProfile | null;
}

export interface WorkspaceActionResult extends WorkspaceStatus {
  readonly ok: boolean;
  readonly action: WorkspaceBindAction;
  readonly freshSessionSlice: boolean;
  readonly authorized?: boolean | undefined;
  readonly authorizationChanged?: boolean | undefined;
  readonly nextCall?: WorkspaceNextCall | undefined;
  readonly errorCode?: string;
  readonly error?: string;
}

export type OpenedWorkspaceSource = "startup" | "session_opened" | "daemon_authorized";

export interface OpenedWorkspaceView extends ResolvedWorkspace {
  readonly source: OpenedWorkspaceSource;
  readonly active: boolean;
  readonly capabilityProfile: WorkspaceCapabilityProfile;
  readonly openedAt: string;
  readonly lastActivatedAt: string | null;
  readonly activeSessions?: number | undefined;
}

export interface WorkspaceOpenRequest {
  readonly cwd: string;
  readonly activate?: boolean | undefined;
  readonly runCapture?: boolean | undefined;
}

export interface WorkspaceOpenResult extends WorkspaceStatus {
  readonly ok: boolean;
  readonly changed: boolean;
  readonly freshSessionSlice: boolean;
  readonly openedWorkspace?: OpenedWorkspaceView | undefined;
  readonly errorCode?: string;
  readonly error?: string;
}

export interface WorkspaceListOpenedResult {
  readonly sessionMode: WorkspaceMode;
  readonly activeWorktreeId: string | null;
  readonly workspaces: readonly OpenedWorkspaceView[];
}

export interface CausalAttachResult extends WorkspaceStatus {
  readonly ok: boolean;
  readonly action: "attach";
  readonly persistedLocalHistory: PersistedLocalHistorySummary;
  readonly errorCode?: string;
  readonly error?: string;
}

export interface WorkspaceBindRequest {
  readonly cwd: string;
  readonly worktreeRoot?: string | undefined;
  readonly gitCommonDir?: string | undefined;
  readonly repoId?: string | undefined;
}

export interface WorkspaceNextCall {
  readonly tool: "workspace_authorize" | "workspace_bind" | "workspace_status";
  readonly args: Readonly<Record<string, unknown>>;
}

export class WorkspaceBindingRequiredError extends Error {
  readonly code = "UNBOUND_WORKSPACE";

  constructor(toolName: string) {
    super(`Tool ${toolName} requires an active workspace binding. Call workspace_bind first.`);
    this.name = "WorkspaceBindingRequiredError";
  }
}

export class WorkspaceCapabilityDeniedError extends Error {
  readonly code = "CAPABILITY_DENIED";

  constructor(toolName: string) {
    super(`Tool ${toolName} is not enabled in the daemon default capability profile.`);
    this.name = "WorkspaceCapabilityDeniedError";
  }
}

export interface WorkspaceExecutionContext {
  readonly sliceId: string;
  readonly repoId: string;
  readonly worktreeId: string;
  readonly projectRoot: string;
  readonly worktreeRoot: string;
  readonly gitCommonDir: string;
  readonly graftignorePatterns: readonly string[];
  readonly resolvePath: (input: string) => string;
  readonly capabilityProfile: WorkspaceCapabilityProfile;
  readonly warpWriterId: string;
  getCausalContext(): RuntimeCausalContext;
  readonly status: WorkspaceStatus;
  readonly governor: GovernorTracker;
  readonly cache: ObservationCache;
  readonly metrics: Metrics;
  readonly graftDir: string;
  readonly repoState: RepoStateTracker;
  readonly getWarp: () => Promise<WarpContext>;
}

export interface ResolvedWorkspace {
  readonly repoId: string;
  readonly worktreeId: string;
  readonly worktreeRoot: string;
  readonly gitCommonDir: string;
}

export interface WorkspaceAuthorizationPolicy {
  getCapabilityProfile(resolved: ResolvedWorkspace): Promise<WorkspaceCapabilityProfile | null>;
  noteBound(resolved: ResolvedWorkspace): Promise<void>;
}

export interface WorkspaceSharedAttachPolicy {
  resolveSharedAttachSource(input: {
    readonly sessionId: string;
    readonly repoId: string;
    readonly worktreeId: string;
  }): import("./persisted-local-history.js").PersistedLocalHistorySharedAttachSource | null;
}

export const DEFAULT_DAEMON_CAPABILITY_PROFILE: WorkspaceCapabilityProfile = Object.freeze({
  boundedReads: true,
  structuralTools: true,
  precisionTools: true,
  stateBookmarks: true,
  runtimeLogs: "session_local_only",
  runCapture: false,
});

export const DEFAULT_REPO_LOCAL_CAPABILITY_PROFILE: WorkspaceCapabilityProfile = Object.freeze({
  boundedReads: true,
  structuralTools: true,
  precisionTools: true,
  stateBookmarks: true,
  runtimeLogs: "session_local_only",
  runCapture: true,
});
