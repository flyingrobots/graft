import * as fs from "node:fs/promises";
import * as http from "node:http";
import * as path from "node:path";
import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import { nodeFs } from "../adapters/node-fs.js";
import { nodeGit } from "../adapters/node-git.js";
import { ensureGitVersionSupportsGraft } from "../git/version-guard.js";
import { DaemonControlPlane, type DaemonStatusView } from "./daemon-control-plane.js";
import { DaemonJobScheduler } from "./daemon-job-scheduler.js";
import { ChildProcessDaemonWorkerPool } from "./daemon-worker-pool.js";
import { PersistentMonitorRuntime } from "./persistent-monitor-runtime.js";
import { InMemoryWarpPool } from "./warp-pool.js";
import { openWarp } from "../warp/open.js";
import type { RunCaptureConfig } from "./run-capture-config.js";
import type { RuntimeObservabilityState } from "./runtime-observability.js";
import {
  closeHttpServer,
  defaultDaemonRoot,
  ensurePrivateDirectory,
  isNamedPipePath,
  prepareSocketPath,
  resolveSocketPath,
  tightenSocketPermissions,
} from "./daemon-bootstrap.js";
import {
  createDaemonSessionHost,
  type DaemonSessionHost,
  type SessionSweepResult,
  resolveSessionInactivityTtlMs,
  resolveSessionReaperIntervalMs,
} from "./daemon-session-host.js";
import {
  acquireDaemonRootOwnership,
  type DaemonSessionStorage,
  ensureDaemonSessionsRoot,
  type LegacyUnmarkedSessionPolicy,
  nodeDaemonSessionStorage,
  retainDaemonSessionsRoot,
} from "./daemon-storage-ownership.js";

const HEALTH_PATH = "/healthz";
const MCP_PATH = "/mcp";

export type DaemonHealthStatus = DaemonStatusView;

export interface StartDaemonServerOptions {
  readonly socketPath?: string | undefined;
  readonly graftDir?: string | undefined;
  readonly env?: Readonly<Record<string, string | undefined>> | undefined;
  readonly runCapture?: Partial<RunCaptureConfig> | undefined;
  readonly runtimeObservability?: Partial<RuntimeObservabilityState> | undefined;
  readonly workerPoolSize?: number | undefined;
  readonly persistedLocalHistoryGraph?: boolean | undefined;
  readonly sessionInactivityTtlMs?: number | undefined;
  readonly sessionReaperIntervalMs?: number | undefined;
  readonly sessionStorage?: DaemonSessionStorage | undefined;
  readonly nowMs?: (() => number) | undefined;
}

export interface GraftDaemonServer {
  readonly socketPath: string;
  readonly healthPath: typeof HEALTH_PATH;
  readonly mcpPath: typeof MCP_PATH;
  reapExpiredSessions(): Promise<SessionSweepResult>;
  close(): Promise<void>;
  getHealthStatus(): DaemonHealthStatus;
}

async function runCleanupSteps(steps: readonly (() => Promise<void>)[]): Promise<unknown[]> {
  const errors: unknown[] = [];
  for (const step of steps) {
    try {
      await step();
    } catch (error) {
      errors.push(error);
    }
  }
  return errors;
}

export async function startDaemonServer(options: StartDaemonServerOptions = {}): Promise<GraftDaemonServer> {
  const sessionInactivityTtlMs = resolveSessionInactivityTtlMs(options.sessionInactivityTtlMs);
  const sessionReaperIntervalMs = resolveSessionReaperIntervalMs(options.sessionReaperIntervalMs);
  const sessionStorage = options.sessionStorage ?? nodeDaemonSessionStorage;
  await ensureGitVersionSupportsGraft();
  const graftDir = path.resolve(options.graftDir ?? defaultDaemonRoot());
  const socketPath = resolveSocketPath(options.socketPath, graftDir);
  const legacyUnmarkedSessionPolicy: LegacyUnmarkedSessionPolicy = socketPath === resolveSocketPath(undefined, graftDir)
    ? "remove"
    : "preserve";
  await ensurePrivateDirectory(graftDir);
  const sessionsRoot = path.join(graftDir, "sessions");
  await ensureDaemonSessionsRoot(sessionsRoot);
  const sessionsRootAuthority = await retainDaemonSessionsRoot(sessionsRoot);
  const rootOwnership = await acquireDaemonRootOwnership({
    graftDir,
    socketPath,
  }).catch(async (error: unknown) => {
    await sessionsRootAuthority.close();
    throw error;
  });

  let daemonWorkerPool: ChildProcessDaemonWorkerPool | undefined;
  let monitorRuntime: PersistentMonitorRuntime | undefined;
  let sessionHost: DaemonSessionHost | undefined;
  let httpServer: http.Server | undefined;

  try {
    await prepareSocketPath(socketPath);
    const activeHttpServer = http.createServer((req, res) => {
      const readySessionHost = sessionHost;
      if (readySessionHost === undefined) {
        res.writeHead(503, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "Daemon startup in progress" }));
        return;
      }
      void readySessionHost.handleRequest(req, res);
    });
    httpServer = activeHttpServer;

    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error): void => {
        activeHttpServer.off("listening", onListening);
        reject(error);
      };
      const onListening = (): void => {
        activeHttpServer.off("error", onError);
        resolve();
      };
      activeHttpServer.once("error", onError);
      activeHttpServer.once("listening", onListening);
      activeHttpServer.listen(socketPath);
    });
    await tightenSocketPermissions(socketPath);

    const warpPool = new InMemoryWarpPool((cwd) => openWarp({ cwd }));
    const controlPlane = new DaemonControlPlane({
      fs: nodeFs,
      codec: new CanonicalJsonCodec(),
      git: nodeGit,
      graftDir,
    });
    const daemonScheduler = new DaemonJobScheduler();
    const activeDaemonWorkerPool = new ChildProcessDaemonWorkerPool({
      ...(options.workerPoolSize !== undefined ? { size: options.workerPoolSize } : {}),
    });
    daemonWorkerPool = activeDaemonWorkerPool;
    const activeMonitorRuntime = new PersistentMonitorRuntime({
      fs: nodeFs,
      codec: new CanonicalJsonCodec(),
      git: nodeGit,
      graftDir,
      controlPlane,
      scheduler: daemonScheduler,
      workerPool: activeDaemonWorkerPool,
    });
    monitorRuntime = activeMonitorRuntime;
    const startedAt = new Date().toISOString();
    const transportKind = isNamedPipePath(socketPath) ? "named_pipe" : "unix_socket";

    const getHealthStatus = (): DaemonHealthStatus => {
      return controlPlane.getStatus({
        transport: transportKind,
        sameUserOnly: true,
        socketPath,
        mcpPath: MCP_PATH,
        healthPath: HEALTH_PATH,
        activeWarpRepos: warpPool.size(),
        startedAt,
      }, activeMonitorRuntime.getCounts(), daemonScheduler.getCounts(), activeDaemonWorkerPool.getCounts());
    };

    await controlPlane.initialize();
    await activeMonitorRuntime.initialize();
    const startupOrphans = await sessionStorage.removeSessionOrphanDirectories(
      sessionsRoot,
      new Set(),
      legacyUnmarkedSessionPolicy,
    );
    if (startupOrphans.preservedEntries.length > 0) {
      console.error(
        `[graft] preserved session storage entries: ${JSON.stringify(startupOrphans.preservedEntries)}`,
      );
    }
    if (startupOrphans.failures.length > 0) {
      throw new AggregateError(
        startupOrphans.failures.map((failure) => failure.error),
        "Failed to remove prior-process daemon session directories",
      );
    }

    const activeSessionHost = createDaemonSessionHost({
      graftDir,
      daemonInstanceId: rootOwnership.instanceId,
      socketPath,
      transportKind,
      healthPath: HEALTH_PATH,
      mcpPath: MCP_PATH,
      startedAt,
      sessionStorage,
      sessionsRootAuthority,
      legacyUnmarkedSessionPolicy,
      warpPool,
      controlPlane,
      daemonScheduler,
      daemonWorkerPool: activeDaemonWorkerPool,
      monitorRuntime: activeMonitorRuntime,
      getHealthStatus,
      sessionInactivityTtlMs,
      sessionReaperIntervalMs,
      ...(options.nowMs !== undefined ? { nowMs: options.nowMs } : {}),
      ...(options.env !== undefined ? { env: options.env } : {}),
      ...(options.runCapture !== undefined ? { runCapture: options.runCapture } : {}),
      ...(options.runtimeObservability !== undefined
        ? { runtimeObservability: options.runtimeObservability }
        : {}),
      ...(options.persistedLocalHistoryGraph !== undefined
        ? { persistedLocalHistoryGraph: options.persistedLocalHistoryGraph }
        : {}),
    });
    sessionHost = activeSessionHost;

    let closing: Promise<void> | null = null;

    const shutdown = (): void => {
      void daemon.close().then(() => {
        process.exitCode = process.exitCode ?? 0;
      }).catch((error: unknown) => {
        console.error({
          code: "DAEMON_SIGNAL_SHUTDOWN_FAILED",
          error,
        });
        if (process.exitCode === undefined || process.exitCode === 0) {
          process.exitCode = 1;
        }
      });
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);

    const daemon: GraftDaemonServer = {
      socketPath,
      healthPath: HEALTH_PATH,
      mcpPath: MCP_PATH,
      reapExpiredSessions(): Promise<SessionSweepResult> {
        return activeSessionHost.reapExpiredSessions();
      },
      getHealthStatus(): DaemonHealthStatus {
        return getHealthStatus();
      },
      async close(): Promise<void> {
        if (closing !== null) return closing;
        closing = (async () => {
          process.off("SIGINT", shutdown);
          process.off("SIGTERM", shutdown);
          const errors = await runCleanupSteps([
            () => activeSessionHost.close(),
            () => activeMonitorRuntime.close(),
            () => activeDaemonWorkerPool.close(),
            () => closeHttpServer(activeHttpServer),
            async () => {
              if (!isNamedPipePath(socketPath)) {
                await fs.unlink(socketPath).catch((error: unknown) => {
                  if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
                  throw error;
                });
              }
            },
            () => sessionsRootAuthority.close(),
            () => rootOwnership.release(),
          ]);
          if (errors.length > 0) {
            throw new AggregateError(errors, "Failed to close the Graft daemon cleanly");
          }
        })();
        return closing;
      },
    };

    return daemon;
  } catch (error) {
    const cleanupSteps: (() => Promise<void>)[] = [];
    const sessionHostToClose = sessionHost;
    const monitorRuntimeToClose = monitorRuntime;
    const workerPoolToClose = daemonWorkerPool;
    const httpServerToClose = httpServer;
    const ownsSocket = httpServerToClose?.listening === true;
    if (sessionHostToClose !== undefined) cleanupSteps.push(() => sessionHostToClose.close());
    if (monitorRuntimeToClose !== undefined) cleanupSteps.push(() => monitorRuntimeToClose.close());
    if (workerPoolToClose !== undefined) cleanupSteps.push(() => workerPoolToClose.close());
    if (ownsSocket) cleanupSteps.push(() => closeHttpServer(httpServerToClose));
    if (ownsSocket && !isNamedPipePath(socketPath)) {
      cleanupSteps.push(async () => {
        await fs.unlink(socketPath).catch((unlinkError: unknown) => {
          if (unlinkError instanceof Error && "code" in unlinkError && unlinkError.code === "ENOENT") return;
          throw unlinkError;
        });
      });
    }
    cleanupSteps.push(() => sessionsRootAuthority.close());
    cleanupSteps.push(() => rootOwnership.release());
    const cleanupErrors = await runCleanupSteps(cleanupSteps);
    if (cleanupErrors.length > 0) {
      throw new AggregateError(cleanupErrors, "Daemon startup and rollback both failed", { cause: error });
    }
    throw error;
  }
}
