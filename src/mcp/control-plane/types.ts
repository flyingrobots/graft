import type { DaemonSchedulerCounts } from "../daemon-job-scheduler.js";
import type { DaemonWorkerCounts } from "../daemon-worker-pool.js";
import type { RuntimeCausalContext } from "../runtime-causal-context.js";
import type {
  WorkspaceBindRequest,
  WorkspaceCapabilityProfile,
  WorkspaceStatus,
} from "../workspace-router.js";

// ---------------------------------------------------------------------------
// Internal: session tracking
// ---------------------------------------------------------------------------

export interface RegisteredSession {
  readonly sessionId: string;
  readonly startedAt: string;
  readonly getWorkspaceStatus: () => WorkspaceStatus;
  readonly getRuntimeCausalContext: () => RuntimeCausalContext | null;
  lastActivityAt: string;
}

// ---------------------------------------------------------------------------
// Authorization types
// ---------------------------------------------------------------------------

export interface AuthorizedWorkspaceRecord {
  readonly repoId: string;
  readonly worktreeId: string;
  readonly worktreeRoot: string;
  readonly gitCommonDir: string;
  readonly capabilityProfile: WorkspaceCapabilityProfile;
  readonly authorizedAt: string;
  readonly lastBoundAt: string | null;
}

export interface AuthorizedWorkspaceView extends AuthorizedWorkspaceRecord {
  readonly activeSessions: number;
}

export interface WorkspaceAuthorizeRequest extends WorkspaceBindRequest {
  readonly runCapture?: boolean | undefined;
}

export interface WorkspaceAuthorizeResult {
  readonly ok: boolean;
  readonly changed: boolean;
  readonly authorization?: AuthorizedWorkspaceView;
  readonly errorCode?: string;
  readonly error?: string;
}

export interface WorkspaceRevokeResult {
  readonly ok: boolean;
  readonly revoked: boolean;
  readonly repoId?: string | null;
  readonly worktreeId?: string | null;
  readonly worktreeRoot?: string | null;
  readonly activeSessions?: number;
  readonly errorCode?: string;
  readonly error?: string;
}

// ---------------------------------------------------------------------------
// Session view
// ---------------------------------------------------------------------------

export interface DaemonSessionView {
  readonly sessionId: string;
  readonly sessionMode: "daemon";
  readonly bindState: WorkspaceStatus["bindState"];
  readonly repoId: string | null;
  readonly worktreeId: string | null;
  readonly worktreeRoot: string | null;
  readonly causalSessionId: string | null;
  readonly checkoutEpochId: string | null;
  readonly capabilityProfile: WorkspaceCapabilityProfile | null;
  readonly startedAt: string;
  readonly lastActivityAt: string;
}

// ---------------------------------------------------------------------------
// Daemon runtime & status projection
// ---------------------------------------------------------------------------

export interface DaemonRuntimeDescriptor {
  readonly transport: "unix_socket" | "named_pipe";
  readonly sameUserOnly: true;
  readonly socketPath: string;
  readonly mcpPath: string;
  readonly healthPath: string;
  readonly activeWarpRepos: number;
  readonly startedAt: string;
}

export interface SharedAttachSource {
  readonly sourceSessionId: string;
  readonly causalSessionId: string;
  readonly strandId: string;
}

export interface DaemonMonitorCounts {
  readonly totalMonitors: number;
  readonly runningMonitors: number;
  readonly pausedMonitors: number;
  readonly stoppedMonitors: number;
  readonly failingMonitors: number;
  readonly backlogMonitors: number;
}

export interface DaemonStatusView extends DaemonRuntimeDescriptor {
  readonly ok: true;
  readonly sessionMode: "daemon";
  readonly activeSessions: number;
  readonly boundSessions: number;
  readonly unboundSessions: number;
  readonly authorizedWorkspaces: number;
  readonly authorizedRepos: number;
  readonly workspaceBindRequiresAuthorization: true;
  readonly defaultCapabilityProfile: WorkspaceCapabilityProfile;
  readonly totalMonitors: number;
  readonly runningMonitors: number;
  readonly pausedMonitors: number;
  readonly stoppedMonitors: number;
  readonly failingMonitors: number;
  readonly backlogMonitors: number;
  readonly scheduler: DaemonSchedulerCounts;
  readonly workers: DaemonWorkerCounts;
}

// ---------------------------------------------------------------------------
// Control plane constructor options
// ---------------------------------------------------------------------------

export interface DaemonControlPlaneOptions {
  readonly fs: FileSystem;
  readonly codec: JsonCodec;
  readonly git: GitClient;
  readonly graftDir: string;
}

// Re-import port types so consumers don't need to reach into ports/
import type { FileSystem } from "../../ports/filesystem.js";
import type { JsonCodec } from "../../ports/codec.js";
import type { GitClient } from "../../ports/git.js";
