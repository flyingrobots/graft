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
      activeWarpRepos: number;
      transport: string;
      socketPath: string;
    };
    expect(initialStatus.activeSessions).toBe(0);
    expect(initialStatus.activeWarpRepos).toBe(0);
    expect(initialStatus.transport).toBe("unix_socket");
    expect(initialStatus.socketPath).toBe(socketPath);

    if (process.platform !== "win32") {
      expect(fs.statSync(socketPath).mode & 0o777).toBe(0o600);
    }

    const sessionId = await initializeSession(socketPath);
    const workspaceStatus = await callTool<{ bindState: string }>(socketPath, sessionId, "workspace_status", {});
    expect(workspaceStatus.bindState).toBe("unbound");

    const openHealth = await requestUnixJson(socketPath, "GET", "/healthz");
    expect((parseJson(openHealth) as { activeSessions: number }).activeSessions).toBe(1);

    await deleteSession(socketPath, sessionId);

    const closedHealth = await requestUnixJson(socketPath, "GET", "/healthz");
    expect((parseJson(closedHealth) as { activeSessions: number }).activeSessions).toBe(0);
  });

  it("shares one repo-scoped warp pool across sessions bound to the same repo", async () => {
    const repoDir = createTestRepo("graft-daemon-repo-");
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

    const sessionA = await initializeSession(socketPath);
    const sessionB = await initializeSession(socketPath);

    const bindA = await callTool<{ ok: boolean; repoId: string }>(
      socketPath,
      sessionA,
      "workspace_bind",
      { cwd: repoDir },
      11,
    );
    const bindB = await callTool<{ ok: boolean; repoId: string }>(
      socketPath,
      sessionB,
      "workspace_bind",
      { cwd: repoDir },
      12,
    );
    expect(bindA.ok).toBe(true);
    expect(bindB.ok).toBe(true);
    expect(bindA.repoId).toBe(bindB.repoId);

    const boundHealth = await requestUnixJson(socketPath, "GET", "/healthz");
    expect((parseJson(boundHealth) as { activeWarpRepos: number }).activeWarpRepos).toBe(0);

    const findA = await callTool<{ total: number }>(socketPath, sessionA, "code_find", { query: "greet" }, 13);
    expect(findA.total).toBe(1);

    const openedHealth = await requestUnixJson(socketPath, "GET", "/healthz");
    expect((parseJson(openedHealth) as { activeWarpRepos: number }).activeWarpRepos).toBe(1);

    const findB = await callTool<{ total: number }>(socketPath, sessionB, "code_find", { query: "greet" }, 14);
    expect(findB.total).toBe(1);

    const sharedHealth = await requestUnixJson(socketPath, "GET", "/healthz");
    expect(parseJson(sharedHealth) as { activeSessions: number; activeWarpRepos: number }).toMatchObject({
      activeSessions: 2,
      activeWarpRepos: 1,
    });
  });
});
