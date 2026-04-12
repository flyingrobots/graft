import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as http from "node:http";
import * as os from "node:os";
import * as path from "node:path";
import { startDaemonServer, type GraftDaemonServer } from "../../../src/mcp/daemon-server.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";

interface JsonResponse {
  readonly statusCode: number;
  readonly headers: http.IncomingHttpHeaders;
  readonly text: string;
}

async function requestUnixJson(
  socketPath: string,
  method: "GET" | "POST" | "DELETE",
  requestPath: string,
  body?: unknown,
  headers: http.OutgoingHttpHeaders = {},
): Promise<JsonResponse> {
  return new Promise<JsonResponse>((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = http.request({
      socketPath,
      path: requestPath,
      method,
      headers: {
        accept: "application/json, text/event-stream",
        ...(payload !== undefined
          ? {
              "content-type": "application/json",
              "content-length": Buffer.byteLength(payload),
            }
          : {}),
        ...headers,
      },
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode ?? 0,
          headers: res.headers,
          text: Buffer.concat(chunks).toString("utf-8"),
        });
      });
    });
    req.once("error", reject);
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

function parseJson(response: JsonResponse): unknown {
  return JSON.parse(response.text) as unknown;
}

function parseMcpResponse(response: JsonResponse): unknown {
  const trimmed = response.text.trim();
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed) as unknown;
  }
  const payloads = trimmed
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trim());
  if (payloads.length === 0) {
    throw new Error(`Unable to parse MCP response: ${response.text}`);
  }
  return JSON.parse(payloads[payloads.length - 1]!) as unknown;
}

async function initializeSession(socketPath: string): Promise<string> {
  const initialize = await requestUnixJson(socketPath, "POST", "/mcp", {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "vitest", version: "0.0.0" },
    },
  });
  expect(initialize.statusCode).toBe(200);
  const sessionIdHeader = initialize.headers["mcp-session-id"];
  const sessionId = Array.isArray(sessionIdHeader) ? sessionIdHeader[0] : sessionIdHeader;
  if (sessionId === undefined) {
    throw new Error("Missing mcp-session-id response header");
  }

  const initialized = await requestUnixJson(socketPath, "POST", "/mcp", {
    jsonrpc: "2.0",
    method: "notifications/initialized",
    params: {},
  }, {
    "mcp-session-id": sessionId,
  });
  expect([200, 202]).toContain(initialized.statusCode);
  return sessionId;
}

async function callTool<T>(
  socketPath: string,
  sessionId: string,
  name: string,
  args: Record<string, unknown>,
  id = 2,
): Promise<T> {
  const response = await requestUnixJson(socketPath, "POST", "/mcp", {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: {
      name,
      arguments: args,
    },
  }, {
    "mcp-session-id": sessionId,
  });
  expect(response.statusCode).toBe(200);
  const payload = parseMcpResponse(response) as { result: { content: { type: string; text: string }[] } };
  return JSON.parse(payload.result.content[0]!.text) as T;
}

async function deleteSession(socketPath: string, sessionId: string): Promise<void> {
  const response = await requestUnixJson(socketPath, "DELETE", "/mcp", undefined, {
    "mcp-session-id": sessionId,
  });
  expect([200, 202]).toContain(response.statusCode);
}

async function waitFor<T>(
  read: () => Promise<T>,
  predicate: (value: T) => boolean,
  timeoutMs = 3_000,
  intervalMs = 50,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    const value = await read();
    if (predicate(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("Timed out waiting for expected daemon state");
}

describe("mcp: daemon transport and lifecycle", () => {
  const repos: string[] = [];
  const roots: string[] = [];
  const daemons: GraftDaemonServer[] = [];

  afterEach(async () => {
    while (daemons.length > 0) {
      await daemons.pop()!.close();
    }
    while (roots.length > 0) {
      fs.rmSync(roots.pop()!, { recursive: true, force: true });
    }
    while (repos.length > 0) {
      cleanupTestRepo(repos.pop()!);
    }
  });

  it("starts on a local socket, reports health, and closes sessions", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-daemon-root-"));
    roots.push(rootDir);
    const socketPath = path.join(rootDir, "daemon.sock");
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
    });
    daemons.push(daemon);

    const initialHealth = await requestUnixJson(socketPath, "GET", "/healthz");
    expect(initialHealth.statusCode).toBe(200);
    const initialStatus = parseJson(initialHealth) as {
      activeSessions: number;
      boundSessions: number;
      unboundSessions: number;
      activeWarpRepos: number;
      authorizedWorkspaces: number;
      transport: string;
      socketPath: string;
      workers: {
        mode: string;
        totalWorkers: number;
        busyWorkers: number;
      };
    };
    expect(initialStatus.activeSessions).toBe(0);
    expect(initialStatus.boundSessions).toBe(0);
    expect(initialStatus.unboundSessions).toBe(0);
    expect(initialStatus.activeWarpRepos).toBe(0);
    expect(initialStatus.authorizedWorkspaces).toBe(0);
    expect(initialStatus.transport).toBe("unix_socket");
    expect(initialStatus.socketPath).toBe(socketPath);
    expect(initialStatus.workers.mode).toBe("child_processes");
    expect(initialStatus.workers.totalWorkers).toBeGreaterThan(0);
    expect(initialStatus.workers.busyWorkers).toBe(0);

    if (process.platform !== "win32") {
      expect(fs.statSync(socketPath).mode & 0o777).toBe(0o600);
    }

    const sessionId = await initializeSession(socketPath);
    const workspaceStatus = await callTool<{ bindState: string }>(socketPath, sessionId, "workspace_status", {});
    expect(workspaceStatus.bindState).toBe("unbound");

    const daemonStatus = await callTool<{ activeSessions: number; unboundSessions: number; workers: { mode: string } }>(
      socketPath,
      sessionId,
      "daemon_status",
      {},
      3,
    );
    expect(daemonStatus.activeSessions).toBe(1);
    expect(daemonStatus.unboundSessions).toBe(1);
    expect(daemonStatus.workers.mode).toBe("child_processes");

    const openHealth = await requestUnixJson(socketPath, "GET", "/healthz");
    expect((parseJson(openHealth) as { activeSessions: number }).activeSessions).toBe(1);

    await deleteSession(socketPath, sessionId);

    const closedHealth = await requestUnixJson(socketPath, "GET", "/healthz");
    expect((parseJson(closedHealth) as { activeSessions: number }).activeSessions).toBe(0);
  });


  it("preserves safe_read cache behavior across off-process daemon execution", async () => {
    const repoDir = createTestRepo("graft-daemon-safe-read-");
    repos.push(repoDir);
    fs.writeFileSync(path.join(repoDir, "app.ts"), [
      "export function greet(name: string): string {",
      "  return `hello ${name}`;",
      "}",
      "",
    ].join("\n"));
    git(repoDir, "add -A");
    git(repoDir, "commit -m init");

    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-daemon-root-"));
    roots.push(rootDir);
    const socketPath = path.join(rootDir, "daemon.sock");
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
    });
    daemons.push(daemon);

    const sessionId = await initializeSession(socketPath);
    const authorization = await callTool<{ ok: boolean }>(
      socketPath,
      sessionId,
      "workspace_authorize",
      { cwd: repoDir },
      30,
    );
    expect(authorization.ok).toBe(true);
    const bind = await callTool<{ ok: boolean }>(
      socketPath,
      sessionId,
      "workspace_bind",
      { cwd: repoDir },
      31,
    );
    expect(bind.ok).toBe(true);

    const firstRead = await callTool<{ projection: string }>(
      socketPath,
      sessionId,
      "safe_read",
      { path: "app.ts" },
      32,
    );
    expect(firstRead.projection).toBe("content");

    const secondRead = await callTool<{ projection: string; reason: string }>(
      socketPath,
      sessionId,
      "safe_read",
      { path: "app.ts" },
      33,
    );
    expect(secondRead.projection).toBe("cache_hit");
    expect(secondRead.reason).toBe("REREAD_UNCHANGED");

    const daemonStatus = await callTool<{ workers: { completedTasks: number; mode: string } }>(
      socketPath,
      sessionId,
      "daemon_status",
      {},
      34,
    );
    expect(daemonStatus.workers.mode).toBe("child_processes");
    expect(daemonStatus.workers.completedTasks).toBeGreaterThanOrEqual(2);
  });

  it("offloads dirty precision lookups through child-process workers", async () => {
    const repoDir = createTestRepo("graft-daemon-precision-live-");
    repos.push(repoDir);
    fs.writeFileSync(path.join(repoDir, "app.ts"), [
      "export function greet(name: string): string {",
      "  return `hello ${name}`;",
      "}",
      "",
    ].join("\n"));
    git(repoDir, "add -A");
    git(repoDir, "commit -m init");
    fs.writeFileSync(path.join(repoDir, "app.ts"), [
      "export function greet(name: string): string {",
      "  return `hey ${name}`;",
      "}",
      "",
    ].join("\n"));

    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-daemon-root-"));
    roots.push(rootDir);
    const socketPath = path.join(rootDir, "daemon.sock");
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
    });
    daemons.push(daemon);

    const sessionId = await initializeSession(socketPath);
    await callTool<{ ok: boolean }>(
      socketPath,
      sessionId,
      "workspace_authorize",
      { cwd: repoDir },
      40,
    );
    await callTool<{ ok: boolean }>(
      socketPath,
      sessionId,
      "workspace_bind",
      { cwd: repoDir },
      41,
    );

    const find = await callTool<{ total: number; source: string; layer: string }>(
      socketPath,
      sessionId,
      "code_find",
      { query: "greet" },
      42,
    );
    expect(find).toMatchObject({
      total: 1,
      source: "live",
      layer: "workspace_overlay",
    });

    const show = await callTool<{ symbol: string; source: string; layer: string; content: string }>(
      socketPath,
      sessionId,
      "code_show",
      { symbol: "greet" },
      43,
    );
    expect(show.symbol).toBe("greet");
    expect(show.source).toBe("live");
    expect(show.layer).toBe("workspace_overlay");
    expect(show.content).toContain("return `hey ${name}`;");

    const daemonStatus = await callTool<{ workers: { completedTasks: number; mode: string } }>(
      socketPath,
      sessionId,
      "daemon_status",
      {},
      44,
    );
    expect(daemonStatus.workers.mode).toBe("child_processes");
    expect(daemonStatus.workers.completedTasks).toBeGreaterThanOrEqual(2);
  });

  it("persists repo-scoped monitor lifecycle across daemon restart", { timeout: 10_000 }, async () => {
    const repoDir = createTestRepo("graft-daemon-monitor-");
    repos.push(repoDir);
    fs.writeFileSync(path.join(repoDir, "app.ts"), "export const ready = true;\n");
    git(repoDir, "add -A");
    git(repoDir, "commit -m init");

    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-daemon-root-"));
    roots.push(rootDir);
    const socketPath = path.join(rootDir, "daemon.sock");

    const daemonA = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
    });
    daemons.push(daemonA);

    const sessionA = await initializeSession(socketPath);
    await callTool(socketPath, sessionA, "workspace_authorize", { cwd: repoDir }, 20);
    const started = await callTool<{ ok: boolean; status: { repoId: string } }>(
      socketPath,
      sessionA,
      "monitor_start",
      { cwd: repoDir, pollIntervalMs: 60_000 },
      21,
    );
    expect(started.ok).toBe(true);

    const runningHealth = await waitFor(
      async () => parseJson(await requestUnixJson(socketPath, "GET", "/healthz")) as {
        totalMonitors: number;
        runningMonitors: number;
        workers: { mode: string };
      },
      (status) => status.totalMonitors === 1 && status.runningMonitors === 1,
    );
    expect(runningHealth).toMatchObject({
      totalMonitors: 1,
      runningMonitors: 1,
    });
    expect(runningHealth.workers.mode).toBe("child_processes");

    await daemonA.close();
    daemons.pop();

    const daemonB = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
    });
    daemons.push(daemonB);

    const sessionB = await initializeSession(socketPath);
    const restartedMonitors = await waitFor(
      async () => callTool<{ monitors: { repoId: string; lifecycleState: string }[] }>(
        socketPath,
        sessionB,
        "daemon_monitors",
        {},
        22,
      ),
      (status) => status.monitors.length === 1,
    );
    expect(restartedMonitors.monitors).toEqual([
      expect.objectContaining({
        repoId: started.status.repoId,
        lifecycleState: "running",
      }),
    ]);

    const restartedStatus = await callTool<{ totalMonitors: number; runningMonitors: number }>(
      socketPath,
      sessionB,
      "daemon_status",
      {},
      23,
    );
    expect(restartedStatus).toMatchObject({
      totalMonitors: 1,
      runningMonitors: 1,
    });

    const restartedHealth = parseJson(await requestUnixJson(socketPath, "GET", "/healthz")) as {
      workers: { mode: string; completedTasks: number };
    };
    expect(restartedHealth.workers.mode).toBe("child_processes");
    expect(restartedHealth.workers.completedTasks).toBe(0);

    const stopped = await callTool<{ ok: boolean; status: { lifecycleState: string } }>(
      socketPath,
      sessionB,
      "monitor_stop",
      { cwd: repoDir },
      24,
    );
    expect(stopped.ok).toBe(true);
    expect(stopped.status.lifecycleState).toBe("stopped");
  });
});
