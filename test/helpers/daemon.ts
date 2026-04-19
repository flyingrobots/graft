import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { CanonicalJsonCodec } from "../../src/adapters/canonical-json.js";
import { nodeFs } from "../../src/adapters/node-fs.js";
import { nodeGit } from "../../src/adapters/node-git.js";
import { DaemonControlPlane } from "../../src/mcp/daemon-control-plane.js";
import { DaemonJobScheduler } from "../../src/mcp/daemon-job-scheduler.js";
import { InlineDaemonWorkerPool } from "../../src/mcp/daemon-worker-pool.js";
import { PersistentMonitorRuntime } from "../../src/mcp/persistent-monitor-runtime.js";
import { createGraftServer, type GraftServer } from "../../src/mcp/server.js";
import { InMemoryWarpPool } from "../../src/mcp/warp-pool.js";
import { openWarp } from "../../src/warp/open.js";
import { parse } from "./mcp.js";

export interface InProcessDaemonSession {
  readonly sessionId: string;
  readonly graftDir: string;
  readonly server: GraftServer;
  callToolJson<T extends Record<string, unknown> = Record<string, unknown>>(
    name: string,
    args: Record<string, unknown>,
  ): Promise<T>;
  close(): void;
}

export interface InProcessDaemonHarness {
  readonly rootDir: string;
  createSession(): InProcessDaemonSession;
  close(): Promise<void>;
}

export async function createInProcessDaemonHarness(): Promise<InProcessDaemonHarness> {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-daemon-in-process-"));
  const codec = new CanonicalJsonCodec();
  const controlPlane = new DaemonControlPlane({
    fs: nodeFs,
    codec,
    git: nodeGit,
    graftDir: rootDir,
  });
  const scheduler = new DaemonJobScheduler();
  const workerPool = new InlineDaemonWorkerPool();
  const monitorRuntime = new PersistentMonitorRuntime({
    fs: nodeFs,
    codec,
    git: nodeGit,
    graftDir: rootDir,
    controlPlane,
    scheduler,
    workerPool,
  });
  const warpPool = new InMemoryWarpPool((cwd, writerId) => openWarp({ cwd, writerId }));
  const startedAt = new Date().toISOString();
  const sessions = new Map<string, InProcessDaemonSession>();

  await controlPlane.initialize();
  await monitorRuntime.initialize();

  const daemonRuntime = () => {
    return {
      transport: "unix_socket" as const,
      sameUserOnly: true as const,
      socketPath: path.join(rootDir, "daemon.sock"),
      mcpPath: "/mcp",
      healthPath: "/healthz",
      activeWarpRepos: warpPool.size(),
      startedAt,
    };
  };

  function createSession(): InProcessDaemonSession {
    const sessionId = crypto.randomUUID();
    const graftDir = path.join(rootDir, "sessions", sessionId);
    fs.mkdirSync(graftDir, { recursive: true });
    const server = createGraftServer({
      mode: "daemon",
      sessionId,
      graftDir,
      warpPool,
      daemonControlPlane: controlPlane,
      daemonScheduler: scheduler,
      daemonWorkerPool: workerPool,
      daemonRuntime,
      monitorRuntime,
    });

    const session: InProcessDaemonSession = {
      sessionId,
      graftDir,
      server,
      async callToolJson<T extends Record<string, unknown> = Record<string, unknown>>(
        name: string,
        args: Record<string, unknown>,
      ): Promise<T> {
        controlPlane.touchTransport(sessionId);
        return parse(await server.callTool(name, args)) as T;
      },
      close(): void {
        controlPlane.unregisterTransport(sessionId);
        sessions.delete(sessionId);
        fs.rmSync(graftDir, { recursive: true, force: true });
      },
    };

    controlPlane.registerTransport(
      sessionId,
      () => server.getWorkspaceStatus(),
      () => server.getRuntimeCausalContext(),
    );
    sessions.set(sessionId, session);
    return session;
  }

  return {
    rootDir,
    createSession,
    async close(): Promise<void> {
      for (const session of [...sessions.values()]) {
        session.close();
      }
      await monitorRuntime.close();
      await workerPool.close();
      fs.rmSync(rootDir, { recursive: true, force: true });
    },
  };
}
