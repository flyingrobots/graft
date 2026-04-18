import type { DaemonSchedulerCounts } from "./daemon-job-scheduler.js";
import { ZERO_SCHEDULER_COUNTS } from "./daemon-job-scheduler.js";
import type { DaemonWorkerCounts } from "./daemon-worker-pool.js";
import type { RuntimeCausalContext } from "./runtime-causal-context.js";
import {
  DEFAULT_DAEMON_CAPABILITY_PROFILE,
  resolveWorkspaceRequest,
  type ResolvedWorkspace,
  type WorkspaceBindRequest,
  type WorkspaceCapabilityProfile,
  type WorkspaceStatus,
} from "./workspace-router.js";

import {
  buildStatePath,
  capabilityProfilesEqual,
  cloneAuthorizedWorkspaceRecord,
  cloneCapabilityProfile,
  loadPersistedState,
  persistState,
  resolveCapabilityProfile,
  sortByWorktreeRoot,
} from "./control-plane/authz-storage.js";

import {
  readRuntimeCausalContext,
  readWorkspaceStatus,
  resolveSharedAttachSource,
  toDaemonSessionView,
} from "./control-plane/session-registry.js";

import {
  buildStatusView,
  toAuthorizedWorkspaceView,
  ZERO_MONITOR_COUNTS,
} from "./control-plane/status-projection.js";

// ---------------------------------------------------------------------------
// Barrel re-exports — keep every public type available from this path
// ---------------------------------------------------------------------------

export type {
  AuthorizedWorkspaceRecord,
  AuthorizedWorkspaceView,
  DaemonControlPlaneOptions,
  DaemonMonitorCounts,
  DaemonRuntimeDescriptor,
  DaemonSessionView,
  DaemonStatusView,
  SharedAttachSource,
  WorkspaceAuthorizeRequest,
  WorkspaceAuthorizeResult,
  WorkspaceRevokeResult,
} from "./control-plane/types.js";

import type {
  AuthorizedWorkspaceRecord,
  AuthorizedWorkspaceView,
  DaemonControlPlaneOptions,
  DaemonMonitorCounts,
  DaemonRuntimeDescriptor,
  DaemonSessionView,
  DaemonStatusView,
  RegisteredSession,
  SharedAttachSource,
  WorkspaceAuthorizeRequest,
  WorkspaceAuthorizeResult,
  WorkspaceRevokeResult,
} from "./control-plane/types.js";

// ---------------------------------------------------------------------------
// DaemonControlPlane
// ---------------------------------------------------------------------------

export class DaemonControlPlane {
  private readonly statePath: string;
  private readonly authorizedWorkspaces = new Map<string, AuthorizedWorkspaceRecord>();
  private readonly sessions = new Map<string, RegisteredSession>();
  private loadPromise: Promise<void> | null = null;

  constructor(private readonly options: DaemonControlPlaneOptions) {
    this.statePath = buildStatePath(options.graftDir);
  }

  initialize(): Promise<void> {
    return this.ensureLoaded();
  }

  registerSession(
    sessionId: string,
    getWorkspaceStatus: () => WorkspaceStatus,
    getRuntimeCausalContext: () => RuntimeCausalContext | null,
  ): void {
    const now = new Date().toISOString();
    this.sessions.set(sessionId, {
      sessionId,
      startedAt: now,
      lastActivityAt: now,
      getWorkspaceStatus,
      getRuntimeCausalContext,
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

  resolveSharedAttachSource(input: {
    readonly sessionId: string;
    readonly repoId: string;
    readonly worktreeId: string;
  }): SharedAttachSource | null {
    return resolveSharedAttachSource(this.sessions, input);
  }

  async authorizeWorkspace(request: WorkspaceAuthorizeRequest): Promise<WorkspaceAuthorizeResult> {
    const resolved = await resolveWorkspaceRequest(this.options.git, request);
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
    const nextCapabilityProfile = resolveCapabilityProfile(
      current?.capabilityProfile,
      DEFAULT_DAEMON_CAPABILITY_PROFILE,
      request.runCapture,
    );
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
      authorization: toAuthorizedWorkspaceView(next, this.activeSessionsFor(next.worktreeId)),
    };
  }

  async revokeWorkspace(request: WorkspaceBindRequest): Promise<WorkspaceRevokeResult> {
    const resolved = await resolveWorkspaceRequest(this.options.git, request);
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
      return toAuthorizedWorkspaceView(record, this.activeSessionsFor(record.worktreeId));
    });
  }

  async listAuthorizedWorkspaceRecords(): Promise<readonly AuthorizedWorkspaceRecord[]> {
    await this.ensureLoaded();
    return sortByWorktreeRoot([...this.authorizedWorkspaces.values()]).map(cloneAuthorizedWorkspaceRecord);
  }

  async getAuthorizedWorkspace(request: WorkspaceBindRequest): Promise<AuthorizedWorkspaceRecord | null> {
    const resolved = await resolveWorkspaceRequest(this.options.git, request);
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
      .map((session) => toDaemonSessionView(session, readWorkspaceStatus, readRuntimeCausalContext))
      .sort((left, right) => left.startedAt.localeCompare(right.startedAt));
  }

  getStatus(
    runtime: DaemonRuntimeDescriptor,
    monitorCounts: DaemonMonitorCounts = ZERO_MONITOR_COUNTS,
    schedulerCounts: DaemonSchedulerCounts = ZERO_SCHEDULER_COUNTS,
    workerCounts: DaemonWorkerCounts,
  ): DaemonStatusView {
    return buildStatusView(
      runtime,
      this.listSessions(),
      this.authorizedWorkspaces,
      DEFAULT_DAEMON_CAPABILITY_PROFILE,
      monitorCounts,
      schedulerCounts,
      workerCounts,
    );
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loadPromise !== null) {
      await this.loadPromise;
      return;
    }

    this.loadPromise = (async () => {
      const decoded = await loadPersistedState(this.statePath, this.options.fs, this.options.codec);
      if (decoded === null) return;
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
    await persistState(this.statePath, this.options.fs, this.options.codec, this.authorizedWorkspaces);
  }

  private activeSessionsFor(worktreeId: string): number {
    return this.listSessions().filter((session) => session.worktreeId === worktreeId).length;
  }
}
