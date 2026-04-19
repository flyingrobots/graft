import * as fs from "node:fs/promises";
import * as http from "node:http";
import * as path from "node:path";
import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import { nodeFs } from "../adapters/node-fs.js";
import { nodeGit } from "../adapters/node-git.js";
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
import { createDaemonSessionHost } from "./daemon-session-host.js";

const HEALTH_PATH = "/healthz";
const MCP_PATH = "/mcp";

export type DaemonHealthStatus = DaemonStatusView;

export interface StartDaemonServerOptions {
  readonly socketPath?: string | undefined;
  readonly graftDir?: string | undefined;
  readonly env?: Readonly<Record<string, string | undefined>> | undefined;
  readonly runCapture?: Partial<RunCaptureConfig> | undefined;
  readonly runtimeObservability?: Partial<RuntimeObservabilityState> | undefined;
}

export interface GraftDaemonServer {
  readonly socketPath: string;
  readonly healthPath: typeof HEALTH_PATH;
  readonly mcpPath: typeof MCP_PATH;
  close(): Promise<void>;
  getHealthStatus(): DaemonHealthStatus;
}

export async function startDaemonServer(options: StartDaemonServerOptions = {}): Promise<GraftDaemonServer> {
  const graftDir = path.resolve(options.graftDir ?? defaultDaemonRoot());
  const socketPath = resolveSocketPath(options.socketPath, graftDir);
  const warpPool = new InMemoryWarpPool((cwd) => openWarp({ cwd }));
  const controlPlane = new DaemonControlPlane({
    fs: nodeFs,
    codec: new CanonicalJsonCodec(),
    git: nodeGit,
    graftDir,
  });
  const daemonScheduler = new DaemonJobScheduler();
  const daemonWorkerPool = new ChildProcessDaemonWorkerPool();
  const monitorRuntime = new PersistentMonitorRuntime({
    fs: nodeFs,
    codec: new CanonicalJsonCodec(),
    git: nodeGit,
    graftDir,
    controlPlane,
    scheduler: daemonScheduler,
    workerPool: daemonWorkerPool,
  });
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
    }, monitorRuntime.getCounts(), daemonScheduler.getCounts(), daemonWorkerPool.getCounts());
  };

  await ensurePrivateDirectory(graftDir);
  await ensurePrivateDirectory(path.join(graftDir, "sessions"));
  await controlPlane.initialize();
  await monitorRuntime.initialize();
  await prepareSocketPath(socketPath);
  const sessionHost = createDaemonSessionHost({
    graftDir,
    socketPath,
    transportKind,
    healthPath: HEALTH_PATH,
    mcpPath: MCP_PATH,
    startedAt,
    warpPool,
    controlPlane,
    daemonScheduler,
    daemonWorkerPool,
    monitorRuntime,
    getHealthStatus,
    ...(options.env !== undefined ? { env: options.env } : {}),
    ...(options.runCapture !== undefined ? { runCapture: options.runCapture } : {}),
    ...(options.runtimeObservability !== undefined
      ? { runtimeObservability: options.runtimeObservability }
      : {}),
  });

  const httpServer = http.createServer((req, res) => {
    void sessionHost.handleRequest(req, res);
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error): void => {
      httpServer.off("listening", onListening);
      reject(error);
    };
    const onListening = (): void => {
      httpServer.off("error", onError);
      resolve();
    };
    httpServer.once("error", onError);
    httpServer.once("listening", onListening);
    httpServer.listen(socketPath);
  });
  await tightenSocketPermissions(socketPath);

  let closing: Promise<void> | null = null;

  const shutdown = (): void => {
    void daemon.close().finally(() => {
      process.exitCode = process.exitCode ?? 0;
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  const daemon: GraftDaemonServer = {
    socketPath,
    healthPath: HEALTH_PATH,
    mcpPath: MCP_PATH,
    getHealthStatus(): DaemonHealthStatus {
      return getHealthStatus();
    },
    async close(): Promise<void> {
      if (closing !== null) return closing;
      closing = (async () => {
        process.off("SIGINT", shutdown);
        process.off("SIGTERM", shutdown);
        await sessionHost.close();
        await monitorRuntime.close();
        await daemonWorkerPool.close();
        await closeHttpServer(httpServer);
        if (!isNamedPipePath(socketPath)) {
          await fs.unlink(socketPath).catch(() => {
            return undefined;
          });
        }
      })();
      return closing;
    },
  };

  return daemon;
}
