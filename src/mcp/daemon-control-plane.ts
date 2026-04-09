import * as path from "node:path";
import { z } from "zod";
import type { JsonCodec } from "../ports/codec.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { GitClient } from "../ports/git.js";
import {
  DEFAULT_DAEMON_CAPABILITY_PROFILE,
  resolveWorkspaceRequest,
  type ResolvedWorkspace,
  type WorkspaceBindRequest,
  type WorkspaceCapabilityProfile,
  type WorkspaceStatus,
} from "./workspace-router.js";

const CONTROL_PLANE_DIR = "control-plane";
const AUTHORIZED_WORKSPACES_FILE = "authorized-workspaces.json";

const workspaceCapabilityProfileSchema = z.object({
  boundedReads: z.boolean(),
  structuralTools: z.boolean(),
  precisionTools: z.boolean(),
  stateBookmarks: z.boolean(),
  runtimeLogs: z.literal("session_local_only"),
  runCapture: z.boolean(),
}).strict();

const authorizedWorkspaceRecordSchema = z.object({
  repoId: z.string(),
  worktreeId: z.string(),
  worktreeRoot: z.string(),
  gitCommonDir: z.string(),
  capabilityProfile: workspaceCapabilityProfileSchema,
  authorizedAt: z.string(),
  lastBoundAt: z.string().nullable(),
}).strict();

const persistedControlPlaneStateSchema = z.object({
  version: z.literal(1),
  workspaces: z.array(authorizedWorkspaceRecordSchema),
}).strict();

type PersistedControlPlaneState = z.infer<typeof persistedControlPlaneStateSchema>;

interface RegisteredSession {
  readonly sessionId: string;
  readonly startedAt: string;
  readonly getWorkspaceStatus: () => WorkspaceStatus;
  lastActivityAt: string;
}

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

export interface DaemonSessionView {
  readonly sessionId: string;
  readonly sessionMode: "daemon";
  readonly bindState: WorkspaceStatus["bindState"];
  readonly repoId: string | null;
  readonly worktreeId: string | null;
  readonly worktreeRoot: string | null;
  readonly capabilityProfile: WorkspaceCapabilityProfile | null;
  readonly startedAt: string;
  readonly lastActivityAt: string;
}

export interface DaemonRuntimeDescriptor {
  readonly transport: "unix_socket" | "named_pipe";
  readonly sameUserOnly: true;
  readonly socketPath: string;
  readonly mcpPath: string;
  readonly healthPath: string;
  readonly activeWarpRepos: number;
  readonly startedAt: string;
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
}

export interface DaemonControlPlaneOptions {
  readonly fs: FileSystem;
  readonly codec: JsonCodec;
  readonly git: GitClient;
  readonly graftDir: string;
}

function cloneCapabilityProfile(
  profile: WorkspaceCapabilityProfile,
): WorkspaceCapabilityProfile {
  return { ...profile };
}

function capabilityProfilesEqual(
  left: WorkspaceCapabilityProfile,
  right: WorkspaceCapabilityProfile,
): boolean {
  return left.boundedReads === right.boundedReads
    && left.structuralTools === right.structuralTools
    && left.precisionTools === right.precisionTools
    && left.stateBookmarks === right.stateBookmarks
    && left.runCapture === right.runCapture;
}

function resolveCapabilityProfile(
  current: WorkspaceCapabilityProfile | undefined,
  runCapture: boolean | undefined,
): WorkspaceCapabilityProfile {
  return {
    ...(current ?? DEFAULT_DAEMON_CAPABILITY_PROFILE),
    ...(runCapture !== undefined ? { runCapture } : {}),
  };
}

function sortByWorktreeRoot(records: readonly AuthorizedWorkspaceRecord[]): AuthorizedWorkspaceRecord[] {
  return [...records].sort((left, right) => left.worktreeRoot.localeCompare(right.worktreeRoot));
}

function cloneAuthorizedWorkspaceRecord(record: AuthorizedWorkspaceRecord): AuthorizedWorkspaceRecord {
  return {
    ...record,
    capabilityProfile: cloneCapabilityProfile(record.capabilityProfile),
  };
}

const ZERO_MONITOR_COUNTS: DaemonMonitorCounts = Object.freeze({
  totalMonitors: 0,
  runningMonitors: 0,
  pausedMonitors: 0,
  stoppedMonitors: 0,
  failingMonitors: 0,
  backlogMonitors: 0,
});

export class DaemonControlPlane {
  private readonly statePath: string;
  private readonly authorizedWorkspaces = new Map<string, AuthorizedWorkspaceRecord>();
  private readonly sessions = new Map<string, RegisteredSession>();
  private loadPromise: Promise<void> | null = null;

  constructor(private readonly options: DaemonControlPlaneOptions) {
    this.statePath = path.join(
      path.resolve(options.graftDir),
      CONTROL_PLANE_DIR,
      AUTHORIZED_WORKSPACES_FILE,
    );
  }

  initialize(): Promise<void> {
    return this.ensureLoaded();
  }

  registerSession(sessionId: string, getWorkspaceStatus: () => WorkspaceStatus): void {
    const now = new Date().toISOString();
    this.sessions.set(sessionId, {
      sessionId,
      startedAt: now,
      lastActivityAt: now,
      getWorkspaceStatus,
    });
  }

  touchSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session === undefined) return;
    session.lastActivityAt = new Date().toISOString();
  }

  unregisterSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  async authorizeWorkspace(request: WorkspaceAuthorizeRequest): Promise<WorkspaceAuthorizeResult> {
    const resolved = resolveWorkspaceRequest(this.options.git, request);
    if ("code" in resolved) {
      return {
        ok: false,
        changed: false,
        errorCode: resolved.code,
        error: resolved.message,
      };
    }

    await this.ensureLoaded();
    const current = this.authorizedWorkspaces.get(resolved.worktreeId);
    const nextCapabilityProfile = resolveCapabilityProfile(current?.capabilityProfile, request.runCapture);
    const next: AuthorizedWorkspaceRecord = {
      ...resolved,
      capabilityProfile: nextCapabilityProfile,
      authorizedAt: current?.authorizedAt ?? new Date().toISOString(),
      lastBoundAt: current?.lastBoundAt ?? null,
    };
    const changed = current === undefined
      ? true
      : current.repoId !== next.repoId
        || current.worktreeRoot !== next.worktreeRoot
        || current.gitCommonDir !== next.gitCommonDir
        || !capabilityProfilesEqual(current.capabilityProfile, next.capabilityProfile);

    this.authorizedWorkspaces.set(next.worktreeId, next);
    await this.persist();
    return {
      ok: true,
      changed,
      authorization: this.toAuthorizedWorkspaceView(next),
    };
  }

  async revokeWorkspace(request: WorkspaceBindRequest): Promise<WorkspaceRevokeResult> {
    const resolved = resolveWorkspaceRequest(this.options.git, request);
    if ("code" in resolved) {
      return {
        ok: false,
        revoked: false,
        errorCode: resolved.code,
        error: resolved.message,
      };
    }

    await this.ensureLoaded();
    const current = this.authorizedWorkspaces.get(resolved.worktreeId);
    if (current === undefined) {
      return {
        ok: false,
        revoked: false,
        repoId: resolved.repoId,
        worktreeId: resolved.worktreeId,
        worktreeRoot: resolved.worktreeRoot,
        activeSessions: this.activeSessionsFor(resolved.worktreeId),
        errorCode: "WORKSPACE_NOT_AUTHORIZED",
        error: `Workspace ${resolved.worktreeRoot} is not authorized.`,
      };
    }

    this.authorizedWorkspaces.delete(resolved.worktreeId);
    await this.persist();
    return {
      ok: true,
      revoked: true,
      repoId: current.repoId,
      worktreeId: current.worktreeId,
      worktreeRoot: current.worktreeRoot,
      activeSessions: this.activeSessionsFor(current.worktreeId),
    };
  }

  async getCapabilityProfile(resolved: ResolvedWorkspace): Promise<WorkspaceCapabilityProfile | null> {
    await this.ensureLoaded();
    const record = this.authorizedWorkspaces.get(resolved.worktreeId);
    return record === undefined ? null : cloneCapabilityProfile(record.capabilityProfile);
  }

  async noteBound(resolved: ResolvedWorkspace): Promise<void> {
    await this.ensureLoaded();
    const current = this.authorizedWorkspaces.get(resolved.worktreeId);
    if (current === undefined) return;
    this.authorizedWorkspaces.set(resolved.worktreeId, {
      ...current,
      lastBoundAt: new Date().toISOString(),
    });
    await this.persist();
  }

  async listAuthorizedWorkspaces(): Promise<readonly AuthorizedWorkspaceView[]> {
    await this.ensureLoaded();
    return sortByWorktreeRoot([...this.authorizedWorkspaces.values()]).map((record) => {
      return this.toAuthorizedWorkspaceView(record);
    });
  }

  async listAuthorizedWorkspaceRecords(): Promise<readonly AuthorizedWorkspaceRecord[]> {
    await this.ensureLoaded();
    return sortByWorktreeRoot([...this.authorizedWorkspaces.values()]).map(cloneAuthorizedWorkspaceRecord);
  }

  async getAuthorizedWorkspace(request: WorkspaceBindRequest): Promise<AuthorizedWorkspaceRecord | null> {
    const resolved = resolveWorkspaceRequest(this.options.git, request);
    if ("code" in resolved) return null;
    await this.ensureLoaded();
    const record = this.authorizedWorkspaces.get(resolved.worktreeId);
    return record === undefined ? null : cloneAuthorizedWorkspaceRecord(record);
  }

  async getAuthorizedWorkspaceForRepo(
    repoId: string,
    preferredWorktreeRoot?: string,
  ): Promise<AuthorizedWorkspaceRecord | null> {
    await this.ensureLoaded();
    const matches = [...this.authorizedWorkspaces.values()].filter((record) => record.repoId === repoId);
    if (matches.length === 0) return null;
    if (preferredWorktreeRoot !== undefined) {
      const preferred = matches.find((record) => record.worktreeRoot === preferredWorktreeRoot);
      if (preferred !== undefined) {
        return cloneAuthorizedWorkspaceRecord(preferred);
      }
    }
    const [first] = sortByWorktreeRoot(matches);
    if (first === undefined) return null;
    return cloneAuthorizedWorkspaceRecord(first);
  }

  listSessions(): readonly DaemonSessionView[] {
    return [...this.sessions.values()]
      .map((session) => this.toDaemonSessionView(session))
      .sort((left, right) => left.startedAt.localeCompare(right.startedAt));
  }

  getStatus(runtime: DaemonRuntimeDescriptor, monitorCounts: DaemonMonitorCounts = ZERO_MONITOR_COUNTS): DaemonStatusView {
    const sessions = this.listSessions();
    const boundSessions = sessions.filter((session) => session.bindState === "bound").length;
    return {
      ok: true,
      sessionMode: "daemon",
      activeSessions: sessions.length,
      boundSessions,
      unboundSessions: sessions.length - boundSessions,
      authorizedWorkspaces: this.authorizedWorkspaces.size,
      authorizedRepos: new Set([...this.authorizedWorkspaces.values()].map((record) => record.repoId)).size,
      workspaceBindRequiresAuthorization: true,
      defaultCapabilityProfile: cloneCapabilityProfile(DEFAULT_DAEMON_CAPABILITY_PROFILE),
      totalMonitors: monitorCounts.totalMonitors,
      runningMonitors: monitorCounts.runningMonitors,
      pausedMonitors: monitorCounts.pausedMonitors,
      stoppedMonitors: monitorCounts.stoppedMonitors,
      failingMonitors: monitorCounts.failingMonitors,
      backlogMonitors: monitorCounts.backlogMonitors,
      ...runtime,
    };
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loadPromise !== null) {
      await this.loadPromise;
      return;
    }

    this.loadPromise = (async () => {
      const raw = await this.options.fs.readFile(this.statePath, "utf-8").catch((error: unknown) => {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
          return null;
        }
        throw error;
      });
      if (raw === null) return;

      const decoded = persistedControlPlaneStateSchema.parse(this.options.codec.decode(raw));
      for (const record of decoded.workspaces) {
        this.authorizedWorkspaces.set(record.worktreeId, {
          repoId: record.repoId,
          worktreeId: record.worktreeId,
          worktreeRoot: record.worktreeRoot,
          gitCommonDir: record.gitCommonDir,
          capabilityProfile: cloneCapabilityProfile(record.capabilityProfile),
          authorizedAt: record.authorizedAt,
          lastBoundAt: record.lastBoundAt,
        });
      }
    })();

    await this.loadPromise;
  }

  private async persist(): Promise<void> {
    const payload: PersistedControlPlaneState = {
      version: 1,
      workspaces: sortByWorktreeRoot([...this.authorizedWorkspaces.values()]),
    };
    await this.options.fs.mkdir(path.dirname(this.statePath), { recursive: true });
    await this.options.fs.writeFile(this.statePath, this.options.codec.encode(payload), "utf-8");
  }

  private activeSessionsFor(worktreeId: string): number {
    return this.listSessions().filter((session) => session.worktreeId === worktreeId).length;
  }

  private toAuthorizedWorkspaceView(record: AuthorizedWorkspaceRecord): AuthorizedWorkspaceView {
    return {
      ...record,
      capabilityProfile: cloneCapabilityProfile(record.capabilityProfile),
      activeSessions: this.activeSessionsFor(record.worktreeId),
    };
  }

  private toDaemonSessionView(session: RegisteredSession): DaemonSessionView {
    const status = this.readWorkspaceStatus(session);
    return {
      sessionId: session.sessionId,
      sessionMode: "daemon",
      bindState: status.bindState,
      repoId: status.repoId,
      worktreeId: status.worktreeId,
      worktreeRoot: status.worktreeRoot,
      capabilityProfile: status.capabilityProfile === null ? null : cloneCapabilityProfile(status.capabilityProfile),
      startedAt: session.startedAt,
      lastActivityAt: session.lastActivityAt,
    };
  }

  private readWorkspaceStatus(session: RegisteredSession): WorkspaceStatus {
    try {
      return session.getWorkspaceStatus();
    } catch {
      return {
        sessionMode: "daemon",
        bindState: "unbound",
        repoId: null,
        worktreeId: null,
        worktreeRoot: null,
        gitCommonDir: null,
        graftDir: null,
        capabilityProfile: null,
      };
    }
  }
}
