import * as path from "node:path";
import type { DaemonMonitorCounts } from "./daemon-control-plane.js";
import {
  resolveWorkspaceRequest,
  type WorkspaceBindRequest,
} from "./workspace-router.js";
import { buildMonitorWarpWriterId } from "../warp/writer-id.js";

import {
  CONTROL_PLANE_DIR,
  MONITORS_FILE,
  type MonitorTimerEntry,
  type PersistedMonitorRecord,
  type MonitorStatusView,
  type MonitorActionResult,
  type MonitorStartRequest,
  type MonitorAction,
  type MonitorLifecycleState,
  type PersistentMonitorRuntimeOptions,
} from "./monitor-types.js";

import {
  loadMonitorRecords,
  persistMonitorRecords,
} from "./monitor-persistence.js";

import {
  deriveHealth,
  deriveTransitionHealth,
  normalizePollIntervalMs,
  sortStatuses,
  toStatusView,
} from "./monitor-health.js";

// ── Barrel re-exports (preserve downstream import paths) ──────────

export type {
  MonitorLifecycleState,
  MonitorHealth,
  MonitorWorkerKind,
  MonitorAction,
  MonitorStatusView,
  MonitorActionResult,
  MonitorStartRequest,
  PersistentMonitorRuntimeOptions,
} from "./monitor-types.js";

// ── Runtime class ──────────────────────────────────────────────────

export class PersistentMonitorRuntime {
  private readonly statePath: string;
  private readonly records = new Map<string, PersistedMonitorRecord>();
  private readonly timers = new Map<string, MonitorTimerEntry>();
  private readonly runningTicks = new Map<string, Promise<void>>();
  private readonly defaultPollIntervalMs: number;
  private loadPromise: Promise<void> | null = null;
  private closing = false;

  constructor(private readonly options: PersistentMonitorRuntimeOptions) {
    this.statePath = path.join(
      path.resolve(options.graftDir),
      CONTROL_PLANE_DIR,
      MONITORS_FILE,
    );
    this.defaultPollIntervalMs = options.defaultPollIntervalMs ?? 5_000;
  }

  async initialize(): Promise<void> {
    await this.ensureLoaded();
    for (const record of this.records.values()) {
      if (record.lifecycleState === "running") {
        this.schedule(record.repoId, 0);
      }
    }
  }

  async close(): Promise<void> {
    this.closing = true;
    for (const timer of this.timers.values()) {
      clearTimeout(timer.timeout);
    }
    this.timers.clear();
    await Promise.all([...this.runningTicks.values()].map((tick) => tick.catch(() => undefined)));
  }

  getCounts(): DaemonMonitorCounts {
    let runningMonitors = 0;
    let pausedMonitors = 0;
    let stoppedMonitors = 0;
    let failingMonitors = 0;
    let backlogMonitors = 0;

    for (const record of this.records.values()) {
      if (record.lifecycleState === "running") runningMonitors++;
      if (record.lifecycleState === "paused") pausedMonitors++;
      if (record.lifecycleState === "stopped") stoppedMonitors++;
      if (record.health === "error" || record.health === "unauthorized") failingMonitors++;
      if (record.backlogCommits > 0) backlogMonitors++;
    }

    return {
      totalMonitors: this.records.size,
      runningMonitors,
      pausedMonitors,
      stoppedMonitors,
      failingMonitors,
      backlogMonitors,
    };
  }

  async listStatuses(): Promise<readonly MonitorStatusView[]> {
    await this.ensureLoaded();
    const authorized = await this.options.controlPlane.listAuthorizedWorkspaceRecords();
    return sortStatuses([...this.records.values()].map((record) => {
      const count = authorized.filter((workspace) => workspace.repoId === record.repoId).length;
      return toStatusView(record, count);
    }));
  }

  async startMonitor(request: MonitorStartRequest): Promise<MonitorActionResult> {
    const authorizedWorkspace = await this.options.controlPlane.getAuthorizedWorkspace(request);
    if (authorizedWorkspace === null) {
      return {
        ok: false,
        action: "start",
        created: false,
        changed: false,
        errorCode: "WORKSPACE_NOT_AUTHORIZED",
        error: `Workspace ${request.cwd} is not authorized for monitoring. Call workspace_authorize first.`,
      };
    }

    await this.ensureLoaded();
    const current = this.records.get(authorizedWorkspace.repoId);
    const pollIntervalMs = normalizePollIntervalMs(
      request.pollIntervalMs,
      current?.pollIntervalMs ?? this.defaultPollIntervalMs,
    );
    const next: PersistedMonitorRecord = {
      repoId: authorizedWorkspace.repoId,
      gitCommonDir: authorizedWorkspace.gitCommonDir,
      anchorWorktreeRoot: authorizedWorkspace.worktreeRoot,
      workerKind: "git_poll_indexer",
      lifecycleState: "running",
      health: "lagging",
      pollIntervalMs,
      lastStartedAt: new Date().toISOString(),
      lastTickAt: current?.lastTickAt ?? null,
      lastSuccessAt: current?.lastSuccessAt ?? null,
      lastError: current?.lastError ?? null,
      lastIndexedCommit: current?.lastIndexedCommit ?? null,
      lastHeadCommit: current?.lastHeadCommit ?? null,
      backlogCommits: current?.backlogCommits ?? 0,
      lastRunCommitsIndexed: current?.lastRunCommitsIndexed ?? 0,
      lastRunPatchesWritten: current?.lastRunPatchesWritten ?? 0,
    };
    const created = current === undefined;
    const changed = created
      || current.lifecycleState !== "running"
      || current.anchorWorktreeRoot !== next.anchorWorktreeRoot
      || current.pollIntervalMs !== next.pollIntervalMs;

    this.records.set(next.repoId, next);
    await this.persist();
    await this.runTick(next.repoId).catch(() => {
      return undefined;
    });

    return {
      ok: true,
      action: "start",
      created,
      changed,
      status: await this.getStatusByRepoId(next.repoId),
    };
  }

  async pauseMonitor(request: WorkspaceBindRequest): Promise<MonitorActionResult> {
    return this.transitionMonitor("pause", request, "paused");
  }

  async resumeMonitor(request: WorkspaceBindRequest): Promise<MonitorActionResult> {
    const transition = await this.transitionMonitor("resume", request, "running");
    if (!transition.ok || transition.status === undefined) {
      return transition;
    }
    const current = this.records.get(transition.status.repoId);
    if (current !== undefined) {
      await this.runTick(current.repoId).catch(() => {
        return undefined;
      });
    }
    return {
      ...transition,
      status: await this.getStatusByRepoId(transition.status.repoId),
    };
  }

  async stopMonitor(request: WorkspaceBindRequest): Promise<MonitorActionResult> {
    return this.transitionMonitor("stop", request, "stopped");
  }

  async nudgeMonitor(request: WorkspaceBindRequest): Promise<MonitorActionResult> {
    await this.ensureLoaded();
    const resolved = await this.resolveAuthorizedRepo(request);
    if ("errorCode" in resolved) {
      return {
        ok: false,
        action: "nudge",
        created: false,
        changed: false,
        errorCode: resolved.errorCode,
        error: resolved.error,
      };
    }
    const { repoId } = resolved;
    const record = this.records.get(repoId);
    if (record?.lifecycleState !== "running") {
      return {
        ok: false,
        action: "nudge",
        created: false,
        changed: false,
        errorCode: "not_running",
        error: "Monitor is not running — start it first.",
      };
    }
    // Fire an immediate tick without changing lifecycle state
    await this.runTick(repoId).catch(() => undefined);
    return {
      ok: true,
      action: "nudge" as MonitorAction,
      created: false,
      changed: false,
      status: await this.getStatusByRepoId(repoId),
    };
  }


  // ── Private: lifecycle transitions ─────────────────────────────

  private async transitionMonitor(
    action: Exclude<MonitorAction, "start">,
    request: WorkspaceBindRequest,
    lifecycleState: MonitorLifecycleState,
  ): Promise<MonitorActionResult> {
    await this.ensureLoaded();
    const resolved = await this.resolveAuthorizedRepo(request);
    if ("errorCode" in resolved) {
      return {
        ok: false,
        action,
        created: false,
        changed: false,
        errorCode: resolved.errorCode,
        error: resolved.error,
      };
    }

    const current = this.records.get(resolved.repoId);
    if (current === undefined) {
      return {
        ok: false,
        action,
        created: false,
        changed: false,
        errorCode: "MONITOR_NOT_FOUND",
        error: `No monitor exists for repo ${resolved.repoId}.`,
      };
    }

    if (lifecycleState !== "running") {
      this.clearTimer(current.repoId);
    }
    this.records.set(current.repoId, {
      ...current,
      lifecycleState,
      health: deriveTransitionHealth(lifecycleState),
      lastError: lifecycleState === "stopped" ? null : current.lastError,
    });
    await this.persist();

    return {
      ok: true,
      action,
      created: false,
      changed: current.lifecycleState !== lifecycleState,
      status: await this.getStatusByRepoId(current.repoId),
    };
  }

  // ── Private: tick scheduling ───────────────────────────────────

  private async runTick(repoId: string): Promise<void> {
    const existing = this.runningTicks.get(repoId);
    if (existing !== undefined) {
      await existing;
      return;
    }

    const tick = this.options.scheduler.enqueue({
      sessionId: null,
      sliceId: null,
      repoId,
      worktreeId: null,
      tool: "monitor_tick",
      kind: "persistent_monitor",
      priority: "background",
      writerId: buildMonitorWarpWriterId(repoId),
    }, async () => {
      const record = this.records.get(repoId);
      if (record?.lifecycleState !== "running" || this.closing) {
        return;
      }

      const tickStartedAt = new Date().toISOString();
      const anchor = await this.options.controlPlane.getAuthorizedWorkspaceForRepo(repoId, record.anchorWorktreeRoot);
      if (anchor === null) {
        const latest = this.records.get(repoId) ?? record;
        this.records.set(repoId, {
          ...latest,
          lastTickAt: tickStartedAt,
          health: deriveHealth(latest.lifecycleState, "unauthorized"),
          lastError: "No authorized workspace is currently available for this repo monitor.",
          backlogCommits: 0,
        });
        await this.persist();
        return;
      }

      try {
        const result = await this.options.workerPool.runMonitorTick({
          repoId,
          worktreeRoot: anchor.worktreeRoot,
          writerId: buildMonitorWarpWriterId(repoId),
          lastIndexedCommit: record.lastIndexedCommit,
        });
        const latest = this.records.get(repoId) ?? record;
        if (result.ok) {
          const activeHealth = result.backlogCommits > 0 ? "lagging" : "ok";
          this.records.set(repoId, {
            ...latest,
            anchorWorktreeRoot: anchor.worktreeRoot,
            gitCommonDir: anchor.gitCommonDir,
            lastTickAt: tickStartedAt,
            lastSuccessAt: new Date().toISOString(),
            lastError: null,
            lastIndexedCommit: result.lastIndexedCommit,
            lastHeadCommit: result.currentHead,
            backlogCommits: result.backlogCommits,
            health: deriveHealth(latest.lifecycleState, activeHealth),
            lastRunCommitsIndexed: result.commitsIndexed,
            lastRunPatchesWritten: result.patchesWritten,
          });
        } else {
          this.records.set(repoId, {
            ...latest,
            anchorWorktreeRoot: anchor.worktreeRoot,
            gitCommonDir: anchor.gitCommonDir,
            lastTickAt: tickStartedAt,
            lastError: result.error,
            lastHeadCommit: result.currentHead,
            backlogCommits: result.backlogCommits,
            health: deriveHealth(latest.lifecycleState, "error"),
          });
        }
      } catch (error) {
        const latest = this.records.get(repoId) ?? record;
        this.records.set(repoId, {
          ...latest,
          anchorWorktreeRoot: anchor.worktreeRoot,
          gitCommonDir: anchor.gitCommonDir,
          lastTickAt: tickStartedAt,
          lastError: error instanceof Error ? error.message : String(error),
          health: deriveHealth(latest.lifecycleState, "error"),
        });
      } finally {
        await this.persist();
      }
    }).finally(() => {
      this.runningTicks.delete(repoId);
      const current = this.records.get(repoId);
      if (current?.lifecycleState === "running" && !this.closing) {
        this.schedule(repoId, current.pollIntervalMs);
      }
    });

    this.runningTicks.set(repoId, tick);
    await tick;
  }

  private schedule(repoId: string, delayMs: number): void {
    if (this.closing) return;
    const record = this.records.get(repoId);
    if (record?.lifecycleState !== "running") return;
    this.clearTimer(repoId);
    this.timers.set(repoId, {
      timeout: setTimeout(() => {
        this.timers.delete(repoId);
        void this.runTick(repoId);
      }, delayMs),
    });
  }

  private clearTimer(repoId: string): void {
    const timer = this.timers.get(repoId);
    if (timer === undefined) return;
    clearTimeout(timer.timeout);
    this.timers.delete(repoId);
  }

  // ── Private: status lookup ─────────────────────────────────────

  private async getStatusByRepoId(repoId: string): Promise<MonitorStatusView> {
    const statuses = await this.listStatuses();
    const status = statuses.find((candidate) => candidate.repoId === repoId);
    if (status === undefined) {
      throw new Error(`Missing monitor status for repo ${repoId}`);
    }
    return status;
  }

  // ── Private: workspace resolution ──────────────────────────────

  private resolveRepo(
    request: WorkspaceBindRequest,
  ): Promise<{ repoId: string } | { errorCode: string; error: string }> {
    return resolveWorkspaceRequest(this.options.git, request).then((resolved) => {
      if ("code" in resolved) {
        return {
          errorCode: resolved.code,
          error: resolved.message,
        };
      }
      return {
        errorCode: "WORKSPACE_NOT_AUTHORIZED",
        error: `Workspace ${resolved.worktreeRoot} is not authorized for monitoring. Call workspace_authorize first.`,
      };
    });
  }

  private async resolveAuthorizedRepo(
    request: WorkspaceBindRequest,
  ): Promise<{ repoId: string } | { errorCode: string; error: string }> {
    const authorized = await this.options.controlPlane.getAuthorizedWorkspace(request);
    if (authorized !== null) {
      return { repoId: authorized.repoId };
    }
    return this.resolveRepo(request);
  }

  // ── Private: persistence ───────────────────────────────────────

  private async ensureLoaded(): Promise<void> {
    if (this.loadPromise !== null) {
      await this.loadPromise;
      return;
    }

    this.loadPromise = (async () => {
      const loaded = await loadMonitorRecords(
        this.options.fs,
        this.options.codec,
        this.statePath,
      );
      for (const record of loaded) {
        this.records.set(record.repoId, record);
      }
    })();

    await this.loadPromise;
  }

  private async persist(): Promise<void> {
    await persistMonitorRecords(
      this.options.fs,
      this.options.codec,
      this.statePath,
      this.records,
    );
  }
}
