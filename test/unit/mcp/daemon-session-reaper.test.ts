import { afterEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as http from "node:http";
import * as os from "node:os";
import * as path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  startDaemonServer,
} from "../../../src/mcp/daemon-server.js";

const cleanups: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    await cleanups.pop()!();
  }
});

interface JsonResponse {
  readonly statusCode: number;
  readonly headers: http.IncomingHttpHeaders;
  readonly text: string;
}

interface OpenEventStream {
  readonly statusCode: number;
  close(): Promise<void>;
}

interface HeldJsonRequest {
  release(): Promise<JsonResponse>;
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

async function openUnixEventStream(
  socketPath: string,
  requestPath: string,
  sessionId: string,
): Promise<OpenEventStream> {
  return new Promise<OpenEventStream>((resolve, reject) => {
    const req = http.request({
      socketPath,
      path: requestPath,
      method: "GET",
      headers: {
        accept: "text/event-stream",
        "mcp-session-id": sessionId,
      },
    });
    let opened = false;
    req.once("error", (error) => {
      if (!opened) reject(error);
    });
    req.once("response", (res) => {
      opened = true;
      res.resume();
      resolve({
        statusCode: res.statusCode ?? 0,
        async close(): Promise<void> {
          if (!res.destroyed) {
            await new Promise<void>((resolveClose) => {
              res.once("close", resolveClose);
              res.destroy();
              req.destroy();
            });
          }
          await new Promise<void>((resolveTurn) => {
            setImmediate(resolveTurn);
          });
        },
      });
    });
    req.end();
  });
}

async function holdUnixJsonRequestBody(
  socketPath: string,
  requestPath: string,
  sessionId: string,
  body: unknown,
): Promise<HeldJsonRequest> {
  const payload = JSON.stringify(body);
  const splitAt = Math.max(1, Math.floor(payload.length / 2));
  const prefix = payload.slice(0, splitAt);
  const suffix = payload.slice(splitAt);

  return new Promise<HeldJsonRequest>((resolveHeld, rejectHeld) => {
    let held = false;
    let resolveResponse!: (response: JsonResponse) => void;
    let rejectResponse!: (error: Error) => void;
    const response = new Promise<JsonResponse>((resolve, reject) => {
      resolveResponse = resolve;
      rejectResponse = reject;
    });
    const req = http.request({
      socketPath,
      path: requestPath,
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
        "content-length": Buffer.byteLength(payload),
        expect: "100-continue",
        "mcp-session-id": sessionId,
      },
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      res.on("end", () => {
        resolveResponse({
          statusCode: res.statusCode ?? 0,
          headers: res.headers,
          text: Buffer.concat(chunks).toString("utf-8"),
        });
      });
    });
    req.once("error", (error) => {
      if (held) {
        rejectResponse(error);
      } else {
        rejectHeld(error);
      }
    });
    req.once("continue", () => {
      req.write(prefix, () => {
        held = true;
        let released = false;
        resolveHeld({
          release(): Promise<JsonResponse> {
            if (!released) {
              released = true;
              req.end(suffix);
            }
            return response;
          },
        });
      });
    });
    req.flushHeaders();
  });
}

describe("mcp: daemon session reaper", () => {
  it("rejects inactivity TTL values outside the positive safe-integer domain", async () => {
    const invalidTtls = [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1.5,
      Number.MAX_SAFE_INTEGER + 1];

    for (const [index, sessionInactivityTtlMs] of invalidTtls.entries()) {
      const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), `graft-session-reaper-ttl-${String(index)}-`));
      const socketPath = path.join(rootDir, "daemon.sock");
      try {
        await expect((async () => {
          const daemon = await startDaemonServer({
            graftDir: rootDir,
            socketPath,
            sessionInactivityTtlMs,
            sessionReaperIntervalMs: 0,
          });
          await daemon.close();
        })()).rejects.toBeInstanceOf(RangeError);
        expect(fs.existsSync(socketPath)).toBe(false);
      } finally {
        fs.rmSync(rootDir, { recursive: true, force: true });
      }
    }
  });

  it("reaps idle sessions exceeding sessionInactivityTtlMs and scrubs session directory", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-reaper-test-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });

    let currentTimeMs = 1_000_000;
    const sessionInactivityTtlMs = 10_000; // 10s

    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionInactivityTtlMs,
      sessionReaperIntervalMs: 0, // manual stepping in test
      nowMs: () => currentTimeMs,
    });
    cleanups.push(() => daemon.close());

    // 1. Initialize a new session
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
    expect(sessionId).toBeDefined();

    const sessionDir = path.join(rootDir, "sessions", sessionId!);
    expect(fs.existsSync(sessionDir)).toBe(true);

    // 2. Advance time by 5 seconds (within TTL) and sweep
    currentTimeMs += 5_000;
    const reapedMid = await daemon.reapExpiredSessions?.();
    expect(reapedMid).toBe(0);
    expect(fs.existsSync(sessionDir)).toBe(true);

    // 3. Advance time by another 6 seconds (total 11s > 10s TTL) and sweep
    currentTimeMs += 6_000;
    const reapedAfter = await daemon.reapExpiredSessions?.();
    expect(reapedAfter).toBe(1);

    // Verify session directory was scrubbed
    expect(fs.existsSync(sessionDir)).toBe(false);

    // 4. Request with expired sessionId should now fail with unknown session error
    const postReq = await requestUnixJson(socketPath, "POST", "/mcp", {
      jsonrpc: "2.0",
      id: 2,
      method: "ping",
      params: {},
    }, {
      "mcp-session-id": sessionId!,
    });
    const parsed = JSON.parse(postReq.text) as { error: { code: number } };
    expect(postReq.statusCode).toBe(500);
    expect(parsed.error.code).toBe(-32000);

    // 5. GET on stream with expired sessionId returns 404
    const getReq = await requestUnixJson(socketPath, "GET", "/mcp", undefined, {
      "mcp-session-id": sessionId!,
    });
    expect(getReq.statusCode).toBe(404);
  });

  it("does not reap sessions that have active in-flight requests even if expired", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-reaper-inflight-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });

    let currentTimeMs = 1_000_000;
    const sessionInactivityTtlMs = 10_000; // 10s

    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionInactivityTtlMs,
      sessionReaperIntervalMs: 0,
      nowMs: () => currentTimeMs,
    });
    cleanups.push(() => daemon.close());

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
    const sessionIdHeader = initialize.headers["mcp-session-id"];
    const sessionId = Array.isArray(sessionIdHeader) ? sessionIdHeader[0] : sessionIdHeader;
    expect(sessionId).toBeDefined();

    const sessionDir = path.join(rootDir, "sessions", sessionId!);
    expect(fs.existsSync(sessionDir)).toBe(true);

    const eventStream = await openUnixEventStream(socketPath, "/mcp", sessionId!);
    expect(eventStream.statusCode).toBe(200);

    // The stream is still open while monotonic elapsed time exceeds the TTL.
    currentTimeMs += 15_000;

    const reapedWhileActive = await daemon.reapExpiredSessions?.();
    expect(reapedWhileActive).toBe(0);
    expect(fs.existsSync(sessionDir)).toBe(true);

    await eventStream.close();
  });

  it("counts an existing-session request before its body finishes arriving", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-reaper-body-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });

    let currentTimeMs = 1_000_000;
    const sessionInactivityTtlMs = 10_000;
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionInactivityTtlMs,
      sessionReaperIntervalMs: 0,
      nowMs: () => currentTimeMs,
    });
    cleanups.push(() => daemon.close());

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
    const sessionIdHeader = initialize.headers["mcp-session-id"];
    const sessionId = Array.isArray(sessionIdHeader) ? sessionIdHeader[0] : sessionIdHeader;
    expect(sessionId).toBeDefined();

    const sessionDir = path.join(rootDir, "sessions", sessionId!);
    const heldRequest = await holdUnixJsonRequestBody(socketPath, "/mcp", sessionId!, {
      jsonrpc: "2.0",
      id: 2,
      method: "ping",
      params: {},
    });

    currentTimeMs += sessionInactivityTtlMs + 1;
    const reapedWhileBodyPending = await daemon.reapExpiredSessions?.();
    const remainedResident = fs.existsSync(sessionDir);
    const response = await heldRequest.release();

    expect(reapedWhileBodyPending).toBe(0);
    expect(remainedResident).toBe(true);
    expect(response.statusCode).toBe(200);

    currentTimeMs += sessionInactivityTtlMs + 1;
    expect(await daemon.reapExpiredSessions?.()).toBe(1);
    expect(fs.existsSync(sessionDir)).toBe(false);
  });

  it("rolls back a session when transport connection fails", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-reaper-connect-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const connect = vi.spyOn(McpServer.prototype, "connect")
      .mockRejectedValueOnce(new Error("injected transport connection failure"));
    cleanups.push(() => {
      connect.mockRestore();
    });

    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
    });
    cleanups.push(() => daemon.close());

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

    const parsed = JSON.parse(initialize.text) as { error: { code: number } };
    expect(initialize.statusCode).toBe(500);
    expect(parsed.error.code).toBe(-32603);
    expect(daemon.getHealthStatus().activeSessions).toBe(0);
    expect(fs.readdirSync(path.join(rootDir, "sessions"))).toEqual([]);
  });
});
