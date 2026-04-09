import * as path from "node:path";
import { z } from "zod";
import { indexCommits } from "../warp/indexer.js";
import type { JsonCodec } from "../ports/codec.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { GitClient } from "../ports/git.js";
import type { DaemonJobScheduler } from "./daemon-job-scheduler.js";
import type { DaemonControlPlane, DaemonMonitorCounts } from "./daemon-control-plane.js";
import {
  resolveWorkspaceRequest,
  type WorkspaceBindRequest,
} from "./workspace-router.js";
import type { WarpPool } from "./warp-pool.js";
import { buildWarpWriterId } from "../warp/writer-id.js";

const CONTROL_PLANE_DIR = "control-plane";
const MONITORS_FILE = "monitors.json";
const DEFAULT_POLL_INTERVAL_MS = 5_000;

export type MonitorLifecycleState = "running" | "paused" | "stopped";
export type MonitorHealth = "ok" | "lagging" | "error" | "unauthorized" | "paused" | "stopped";
export type MonitorWorkerKind = "git_poll_indexer";
export type MonitorAction = "start" | "pause" | "resume" | "stop";

const persistedMonitorSchema = z.object({
  repoId: z.string(),
  gitCommonDir: z.string(),
  anchorWorktreeRoot: z.string(),
  workerKind: z.literal("git_poll_indexer"),
  lifecycleState: z.enum(["running", "paused", "stopped"]),
  health: z.enum(["ok", "lagging", "error", "unauthorized", "paused", "stopped"]),
  pollIntervalMs: z.number().int().positive(),
  lastStartedAt: z.string().nullable(),
  lastTickAt: z.string().nullable(),
  lastSuccessAt: z.string().nullable(),
  lastError: z.string().nullable(),
  lastIndexedCommit: z.string().nullable(),
  lastHeadCommit: z.string().nullable(),
  backlogCommits: z.number().int().nonnegative(),
  lastRunCommitsIndexed: z.number().int().nonnegative(),
  lastRunPatchesWritten: z.number().int().nonnegative(),
}).strict();

const persistedMonitorStateSchema = z.object({
  version: z.literal(1),
  monitors: z.array(persistedMonitorSchema),
}).strict();

type PersistedMonitorRecord = z.infer<typeof persistedMonitorSchema>;
type PersistedMonitorState = z.infer<typeof persistedMonitorStateSchema>;

interface MonitorTimerEntry {
  readonly timeout: ReturnType<typeof setTimeout>;
}

export interface MonitorStatusView {
  readonly repoId: string;
  readonly gitCommonDir: string;
  readonly anchorWorktreeRoot: string;
  readonly authorizedWorkspaces: number;
  readonly workerKind: MonitorWorkerKind;
  readonly lifecycleState: MonitorLifecycleState;
  readonly health: MonitorHealth;
  readonly pollIntervalMs: number;
  readonly lastStartedAt: string | null;
  readonly lastTickAt: string | null;
  readonly lastSuccessAt: string | null;
  readonly lastError: string | null;
  readonly lastIndexedCommit: string | null;
  readonly lastHeadCommit: string | null;
  readonly backlogCommits: number;
  readonly lastRunCommitsIndexed: number;
  readonly lastRunPatchesWritten: number;
}

export interface MonitorActionResult {
  readonly ok: boolean;
  readonly action: MonitorAction;
  readonly created: boolean;
  readonly changed: boolean;
  readonly status?: MonitorStatusView;
  readonly errorCode?: string;
  readonly error?: string;
}

export interface MonitorStartRequest extends WorkspaceBindRequest {
  readonly pollIntervalMs?: number | undefined;
}

export interface PersistentMonitorRuntimeOptions {
  readonly fs: FileSystem;
  readonly codec: JsonCodec;
  readonly git: GitClient;
  readonly graftDir: string;
  readonly controlPlane: DaemonControlPlane;
  readonly warpPool: WarpPool;
  readonly scheduler: DaemonJobScheduler;
  readonly defaultPollIntervalMs?: number | undefined;
}

function normalizePollIntervalMs(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const normalized = Math.trunc(value);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error("pollIntervalMs must be a positive integer");
  }
  return normalized;
}

async function readGit(git: GitClient, cwd: string, args: readonly string[]): Promise<string | null> {
  const result = await git.run({ cwd, args });
  if (result.error !== undefined || result.status !== 0) {
    return null;
  }
  const trimmed = result.stdout.trim();
  return trimmed.length === 0 ? null : trimmed;
}

async function readHeadCommit(git: GitClient, cwd: string): Promise<string | null> {
  return readGit(git, cwd, ["rev-parse", "--verify", "HEAD"]);
}

async function countPendingCommits(
  git: GitClient,
  cwd: string,
  from: string | null,
  to: string | null,
): Promise<number> {
  if (to === null) return 0;
  const range = from === null ? to : `${from}..${to}`;
  const output = await readGit(git, cwd, ["rev-list", "--count", range]);
  if (output === null) return 0;
  const parsed = Number.parseInt(output, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function sortStatuses(statuses: readonly MonitorStatusView[]): readonly MonitorStatusView[] {
  return [...statuses].sort((left, right) => left.gitCommonDir.localeCompare(right.gitCommonDir));
}

function cloneRecord(record: PersistedMonitorRecord): PersistedMonitorRecord {
  return { ...record };
}

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
    this.defaultPollIntervalMs = options.defaultPollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
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
      const authorizedWorkspaces = authorized.filter((workspace) => workspace.repoId === record.repoId).length;
      return {
        repoId: record.repoId,
        gitCommonDir: record.gitCommonDir,
        anchorWorktreeRoot: record.anchorWorktreeRoot,
        authorizedWorkspaces,
        workerKind: record.workerKind,
        lifecycleState: record.lifecycleState,
        health: record.health,
        pollIntervalMs: record.pollIntervalMs,
        lastStartedAt: record.lastStartedAt,
        lastTickAt: record.lastTickAt,
        lastSuccessAt: record.lastSuccessAt,
        lastError: record.lastError,
        lastIndexedCommit: record.lastIndexedCommit,
        lastHeadCommit: record.lastHeadCommit,
        backlogCommits: record.backlogCommits,
        lastRunCommitsIndexed: record.lastRunCommitsIndexed,
        lastRunPatchesWritten: record.lastRunPatchesWritten,
      };
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
    const nextHealth = lifecycleState === "paused"
      ? "paused"
      : lifecycleState === "stopped"
        ? "stopped"
        : "lagging";
    this.records.set(current.repoId, {
      ...current,
      lifecycleState,
      health: nextHealth,
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
      laneKey: `monitor:${repoId}`,
    }, async () => {
      const record = this.records.get(repoId);
      if (record?.lifecycleState !== "running" || this.closing) {
        return;
      }

      const tickStartedAt = new Date().toISOString();
      const anchor = await this.options.controlPlane.getAuthorizedWorkspaceForRepo(repoId, record.anchorWorktreeRoot);
      if (anchor === null) {
        const latest = this.records.get(repoId) ?? record;
        const health = latest.lifecycleState === "paused"
          ? "paused"
          : latest.lifecycleState === "stopped"
            ? "stopped"
            : "unauthorized";
        this.records.set(repoId, {
          ...latest,
          lastTickAt: tickStartedAt,
          health,
          lastError: "No authorized workspace is currently available for this repo monitor.",
          backlogCommits: 0,
        });
        await this.persist();
        return;
      }

      try {
        const headAtStart = await readHeadCommit(this.options.git, anchor.worktreeRoot);
        const warp = await this.options.warpPool.getOrOpen(
          repoId,
          anchor.worktreeRoot,
          buildWarpWriterId("monitor", repoId),
        );
        const result = await indexCommits(warp, {
          cwd: anchor.worktreeRoot,
          git: this.options.git,
          ...(record.lastIndexedCommit !== null ? { from: record.lastIndexedCommit } : {}),
          ...(headAtStart !== null ? { to: headAtStart } : {}),
        });
        const currentHead = await readHeadCommit(this.options.git, anchor.worktreeRoot);
        const lastIndexedCommit = headAtStart ?? record.lastIndexedCommit;
        const backlogCommits = await countPendingCommits(
          this.options.git,
          anchor.worktreeRoot,
          lastIndexedCommit,
          currentHead,
        );
        const latest = this.records.get(repoId) ?? record;
        const nextHealth = latest.lifecycleState === "paused"
          ? "paused"
          : latest.lifecycleState === "stopped"
            ? "stopped"
            : backlogCommits > 0
              ? "lagging"
              : "ok";
        this.records.set(repoId, {
          ...latest,
          anchorWorktreeRoot: anchor.worktreeRoot,
          gitCommonDir: anchor.gitCommonDir,
          lastTickAt: tickStartedAt,
          lastSuccessAt: new Date().toISOString(),
          lastError: null,
          lastIndexedCommit,
          lastHeadCommit: currentHead,
          backlogCommits,
          health: nextHealth,
          lastRunCommitsIndexed: result.commitsIndexed,
          lastRunPatchesWritten: result.patchesWritten,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const currentHead = await readHeadCommit(this.options.git, anchor.worktreeRoot);
        const backlogCommits = await countPendingCommits(
          this.options.git,
          anchor.worktreeRoot,
          record.lastIndexedCommit,
          currentHead,
        );
        const latest = this.records.get(repoId) ?? record;
        const nextHealth = latest.lifecycleState === "paused"
          ? "paused"
          : latest.lifecycleState === "stopped"
            ? "stopped"
            : "error";
        this.records.set(repoId, {
          ...latest,
          anchorWorktreeRoot: anchor.worktreeRoot,
          gitCommonDir: anchor.gitCommonDir,
          lastTickAt: tickStartedAt,
          lastError: message,
          lastHeadCommit: currentHead,
          backlogCommits,
          health: nextHealth,
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

  private async getStatusByRepoId(repoId: string): Promise<MonitorStatusView> {
    const statuses = await this.listStatuses();
    const status = statuses.find((candidate) => candidate.repoId === repoId);
    if (status === undefined) {
      throw new Error(`Missing monitor status for repo ${repoId}`);
    }
    return status;
  }

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
      const decoded = persistedMonitorStateSchema.parse(this.options.codec.decode(raw));
      for (const record of decoded.monitors) {
        this.records.set(record.repoId, cloneRecord(record));
      }
    })();

    await this.loadPromise;
  }

  private async persist(): Promise<void> {
    const payload: PersistedMonitorState = {
      version: 1,
      monitors: [...this.records.values()]
        .map(cloneRecord)
        .sort((left, right) => left.gitCommonDir.localeCompare(right.gitCommonDir)),
    };
    await this.options.fs.mkdir(path.dirname(this.statePath), { recursive: true });
    await this.options.fs.writeFile(this.statePath, this.options.codec.encode(payload), "utf-8");
  }
}
