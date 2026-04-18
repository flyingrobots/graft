import { z } from "zod";
import type { JsonCodec } from "../ports/codec.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { GitClient } from "../ports/git.js";
import type { DaemonJobScheduler } from "./daemon-job-scheduler.js";
import type { DaemonWorkerPool } from "./daemon-worker-pool.js";
import type { DaemonControlPlane } from "./daemon-control-plane.js";
import type { WorkspaceBindRequest } from "./workspace-router.js";

// ── Constants ──────────────────────────────────────────────────────

export const CONTROL_PLANE_DIR = "control-plane";
export const MONITORS_FILE = "monitors.json";
export const DEFAULT_POLL_INTERVAL_MS = 5_000;

// ── Lifecycle and health unions ────────────────────────────────────

export type MonitorLifecycleState = "running" | "paused" | "stopped";
export type MonitorHealth = "ok" | "lagging" | "error" | "unauthorized" | "paused" | "stopped";
export type MonitorWorkerKind = "git_poll_indexer";
export type MonitorAction = "start" | "pause" | "resume" | "stop";

// ── Persistence schemas ────────────────────────────────────────────

export const persistedMonitorSchema = z.object({
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

export const persistedMonitorStateSchema = z.object({
  version: z.literal(1),
  monitors: z.array(persistedMonitorSchema),
}).strict();

export type PersistedMonitorRecord = z.infer<typeof persistedMonitorSchema>;
export type PersistedMonitorState = z.infer<typeof persistedMonitorStateSchema>;

// ── Timer entry ────────────────────────────────────────────────────

export interface MonitorTimerEntry {
  readonly timeout: ReturnType<typeof setTimeout>;
}

// ── Public view and result types ───────────────────────────────────

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
  readonly scheduler: DaemonJobScheduler;
  readonly workerPool: DaemonWorkerPool;
  readonly defaultPollIntervalMs?: number | undefined;
}
