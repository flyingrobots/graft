import { afterEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as fsPromises from "node:fs/promises";
import * as http from "node:http";
import * as os from "node:os";
import * as path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { DaemonControlPlane } from "../../../src/mcp/daemon-control-plane.js";
import { PersistentMonitorRuntime } from "../../../src/mcp/persistent-monitor-runtime.js";
import * as graftServerModule from "../../../src/mcp/server.js";
import {
  daemonRootOwnerIsLive,
  type LegacyUnmarkedSessionPolicy,
  quarantineDaemonRootOwner,
  publishDaemonRootOwner,
  readProcessStartIdentity,
  removeSessionDirectory,
  removeSessionOrphanDirectories,
  writeSessionOwnershipMarker,
} from "../../../src/mcp/daemon-storage-ownership.js";
import {
  DEFAULT_SESSION_INACTIVITY_TTL_MS,
  DEFAULT_SESSION_REAPER_INTERVAL_MS,
  resolveSessionInactivityTtlMs,
  resolveSessionReaperIntervalMs,
} from "../../../src/mcp/daemon-session-host.js";
import {
  startDaemonServer,
} from "../../../src/mcp/daemon-server.js";

const {
  randomUUIDMock,
  renameObserver,
  linkObserver,
  readdirObserver,
  readFileObserver,
} = vi.hoisted(() => ({
  randomUUIDMock: vi.fn(),
  renameObserver: vi.fn(),
  linkObserver: vi.fn(),
  readdirObserver: vi.fn(),
  readFileObserver: vi.fn(),
}));

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  randomUUIDMock.mockImplementation(actual.randomUUID);
  return { ...actual, randomUUID: randomUUIDMock };
});

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    async rename(oldPath: fs.PathLike, newPath: fs.PathLike): Promise<void> {
      try {
        await actual.rename(oldPath, newPath);
        await renameObserver(oldPath, newPath, null);
      } catch (error) {
        await renameObserver(oldPath, newPath, error);
        throw error;
      }
    },
    async link(existingPath: fs.PathLike, newPath: fs.PathLike): Promise<void> {
      try {
        await actual.link(existingPath, newPath);
        await linkObserver(existingPath, newPath, null);
      } catch (error) {
        await linkObserver(existingPath, newPath, error);
        throw error;
      }
    },
    async readdir(
      directoryPath: fs.PathLike,
      options: { withFileTypes: true },
    ): Promise<fs.Dirent[]> {
      await readdirObserver(directoryPath, options);
      return actual.readdir(directoryPath, options);
    },
    async readFile(filePath: fs.PathLike, encoding: BufferEncoding): Promise<string> {
      const source = await actual.readFile(filePath, encoding);
      await readFileObserver(filePath, encoding, source);
      return source;
    },
  };
});

const cleanups: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  renameObserver.mockReset();
  linkObserver.mockReset();
  readdirObserver.mockReset();
  readFileObserver.mockReset();
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

function flattenErrors(error: unknown): unknown[] {
  if (!(error instanceof AggregateError)) return [error];
  return [error, ...error.errors.flatMap((nested) => flattenErrors(nested))];
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

async function initializeDaemonSession(socketPath: string, requestId: number): Promise<string> {
  const initialize = await requestUnixJson(socketPath, "POST", "/mcp", {
    jsonrpc: "2.0",
    id: requestId,
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
  if (sessionId === undefined) throw new Error("Missing mcp-session-id response header");

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

async function listDaemonSessionActivity(
  socketPath: string,
  observerSessionId: string,
  requestId: number,
): Promise<readonly { readonly sessionId: string; readonly lastActivityAt: string }[]> {
  const response = await requestUnixJson(socketPath, "POST", "/mcp", {
    jsonrpc: "2.0",
    id: requestId,
    method: "tools/call",
    params: {
      name: "daemon_sessions",
      arguments: {},
    },
  }, {
    "mcp-session-id": observerSessionId,
  });
  expect(response.statusCode).toBe(200);
  const payload = parseMcpResponse(response) as {
    result: { content: readonly { readonly type: string; readonly text: string }[] };
  };
  const result = JSON.parse(payload.result.content[0]!.text) as {
    sessions: readonly { readonly sessionId: string; readonly lastActivityAt: string }[];
  };
  return result.sessions;
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
  it("resolves the documented daemon session lifecycle defaults", () => {
    expect(DEFAULT_SESSION_INACTIVITY_TTL_MS).toBe(30 * 60 * 1000);
    expect(DEFAULT_SESSION_REAPER_INTERVAL_MS).toBe(60 * 1000);
    expect(resolveSessionInactivityTtlMs(undefined)).toBe(DEFAULT_SESSION_INACTIVITY_TTL_MS);
    expect(resolveSessionReaperIntervalMs(undefined)).toBe(DEFAULT_SESSION_REAPER_INTERVAL_MS);
  });

  it("rejects reaper intervals outside Node's supported timer domain", async () => {
    const invalidIntervals = [-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1.5,
      2_147_483_648, Number.MAX_SAFE_INTEGER + 1];

    for (const [index, sessionReaperIntervalMs] of invalidIntervals.entries()) {
      const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), `graft-session-reaper-interval-${String(index)}-`));
      const socketPath = path.join(rootDir, "daemon.sock");
      try {
        await expect((async () => {
          const daemon = await startDaemonServer({
            graftDir: rootDir,
            socketPath,
            sessionReaperIntervalMs,
          });
          await daemon.close();
        })()).rejects.toBeInstanceOf(RangeError);
        expect(fs.existsSync(socketPath)).toBe(false);
      } finally {
        fs.rmSync(rootDir, { recursive: true, force: true });
      }
    }
  });

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

  it("does not expire sessions when the wall clock jumps forward", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-reaper-clock-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const wallClock = vi.spyOn(Date, "now").mockReturnValue(1_000_000);
    cleanups.push(() => {
      wallClock.mockRestore();
    });

    const sessionInactivityTtlMs = 10_000;
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionInactivityTtlMs,
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
    const sessionIdHeader = initialize.headers["mcp-session-id"];
    const sessionId = Array.isArray(sessionIdHeader) ? sessionIdHeader[0] : sessionIdHeader;
    expect(sessionId).toBeDefined();

    wallClock.mockReturnValue(1_000_000 + sessionInactivityTtlMs + 1);

    expect(await daemon.reapExpiredSessions()).toMatchObject({ sessionsRetired: 0 });
    expect(fs.existsSync(path.join(rootDir, "sessions", sessionId!))).toBe(true);
  });

  it.each([
    ["NaN", Number.NaN, "NON_FINITE"],
    ["positive infinity", Number.POSITIVE_INFINITY, "NON_FINITE"],
    ["negative", -1, "NEGATIVE"],
    ["regressing", 999, "REGRESSION"],
  ] as const)("refuses a %s injected monotonic clock sample without poisoning later sweeps", async (
    _label,
    invalidSample,
    reason,
  ) => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-reaper-invalid-clock-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let currentTimeMs = 1_000;
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionInactivityTtlMs: 10_000,
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

    currentTimeMs = invalidSample;
    expect(await daemon.reapExpiredSessions()).toMatchObject({
      sessionsRetired: 0,
      liveDirectoriesRemoved: 0,
      orphanDirectoriesRemoved: 0,
      cleanupFailures: [],
      sweepFailure: {
        code: "MONOTONIC_CLOCK_INVALID",
        reason,
        received: String(invalidSample),
        previousAcceptedMs: 1_000,
      },
    });
    expect(fs.existsSync(sessionDir)).toBe(true);

    currentTimeMs = 11_001;
    expect(await daemon.reapExpiredSessions()).toMatchObject({
      sessionsRetired: 1,
      sweepFailure: null,
    });
    expect(fs.existsSync(sessionDir)).toBe(false);
  });

  it("rebases idleness after an invalid request-start clock sample", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-clk-start-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let currentTimeMs = 1_000;
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionInactivityTtlMs: 10_000,
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

    currentTimeMs = Number.NaN;
    const failedRequest = await requestUnixJson(socketPath, "POST", "/mcp", {
      jsonrpc: "2.0",
      id: 2,
      method: "ping",
      params: {},
    }, { "mcp-session-id": sessionId! });
    expect(failedRequest.statusCode).toBe(500);

    currentTimeMs = 11_001;
    expect(await daemon.reapExpiredSessions()).toMatchObject({
      sessionsRetired: 0,
      sweepFailure: {
        code: "MONOTONIC_CLOCK_INVALID",
        reason: "NON_FINITE",
        received: "NaN",
        previousAcceptedMs: 1_000,
      },
    });
    expect(fs.existsSync(sessionDir)).toBe(true);

    currentTimeMs = 21_002;
    expect(await daemon.reapExpiredSessions()).toMatchObject({
      sessionsRetired: 1,
      sweepFailure: null,
    });
    expect(fs.existsSync(sessionDir)).toBe(false);
  });

  it("rebases idleness after an invalid request-settlement clock sample", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-clk-settle-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let currentTimeMs = 1_000;
    let markInvalidSampleObserved!: () => void;
    const invalidSampleObserved = new Promise<void>((resolve) => {
      markInvalidSampleObserved = resolve;
    });
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionInactivityTtlMs: 10_000,
      sessionReaperIntervalMs: 0,
      nowMs: () => {
        if (!Number.isFinite(currentTimeMs)) markInvalidSampleObserved();
        return currentTimeMs;
      },
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

    currentTimeMs = Number.NaN;
    const response = heldRequest.release();
    await invalidSampleObserved;
    expect((await response).statusCode).toBe(200);

    currentTimeMs = 11_001;
    expect(await daemon.reapExpiredSessions()).toMatchObject({
      sessionsRetired: 0,
      sweepFailure: {
        code: "MONOTONIC_CLOCK_INVALID",
        reason: "NON_FINITE",
        received: "NaN",
        previousAcceptedMs: 1_000,
      },
    });
    expect(fs.existsSync(sessionDir)).toBe(true);

    currentTimeMs = 21_002;
    expect(await daemon.reapExpiredSessions()).toMatchObject({
      sessionsRetired: 1,
      sweepFailure: null,
    });
    expect(fs.existsSync(sessionDir)).toBe(false);
  });

  it("reports each retained session clock failure before clearing it", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-clk-multiple-retained-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let currentTimeMs = 1_000;
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionInactivityTtlMs: 10_000,
      sessionReaperIntervalMs: 0,
      nowMs: () => currentTimeMs,
    });
    cleanups.push(() => daemon.close());

    const initializeSession = async (id: number): Promise<string> => {
      const initialize = await requestUnixJson(socketPath, "POST", "/mcp", {
        jsonrpc: "2.0",
        id,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "vitest", version: "0.0.0" },
        },
      });
      const header = initialize.headers["mcp-session-id"];
      const sessionId = Array.isArray(header) ? header[0] : header;
      if (sessionId === undefined) throw new Error("Expected MCP session ID");
      return sessionId;
    };
    const firstSessionId = await initializeSession(1);
    const secondSessionId = await initializeSession(2);

    currentTimeMs = Number.NaN;
    expect((await requestUnixJson(socketPath, "POST", "/mcp", {
      jsonrpc: "2.0",
      id: 3,
      method: "ping",
      params: {},
    }, { "mcp-session-id": firstSessionId })).statusCode).toBe(500);
    currentTimeMs = -1;
    expect((await requestUnixJson(socketPath, "POST", "/mcp", {
      jsonrpc: "2.0",
      id: 4,
      method: "ping",
      params: {},
    }, { "mcp-session-id": secondSessionId })).statusCode).toBe(500);

    currentTimeMs = 2_000;
    expect(await daemon.reapExpiredSessions()).toMatchObject({
      sessionsRetired: 0,
      sweepFailure: {
        code: "MONOTONIC_CLOCK_INVALID",
        reason: "NON_FINITE",
        received: "NaN",
        previousAcceptedMs: 1_000,
      },
    });
    currentTimeMs = 2_001;
    expect(await daemon.reapExpiredSessions()).toMatchObject({
      sessionsRetired: 0,
      sweepFailure: {
        code: "MONOTONIC_CLOCK_INVALID",
        reason: "NEGATIVE",
        received: "-1",
        previousAcceptedMs: 1_000,
      },
    });
    currentTimeMs = 2_002;
    expect(await daemon.reapExpiredSessions()).toMatchObject({
      sessionsRetired: 0,
      sweepFailure: null,
    });
  });

  it("removes prior-process session directories before accepting requests", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-reaper-restart-"));
    const socketPath = path.join(rootDir, "mcp.sock");
    const sessionsRoot = path.join(rootDir, "sessions");
    const orphanDir = path.join(sessionsRoot, "00000000-0000-4000-8000-000000000001");
    const malformedDir = path.join(sessionsRoot, "00000000-0000-4000-8000-000000000002");
    const uuidFile = path.join(sessionsRoot, "00000000-0000-4000-8000-000000000003");
    const uuidLink = path.join(sessionsRoot, "00000000-0000-4000-8000-000000000004");
    const unsafeMarkerDir = path.join(sessionsRoot, "00000000-0000-4000-8000-000000000006");
    const impossibleLegacyDir = path.join(sessionsRoot, "00000000-0000-0000-0000-000000000000");
    const unrelatedDir = path.join(sessionsRoot, "operator-owned");
    const linkTarget = path.join(rootDir, "link-target");
    fs.mkdirSync(orphanDir, { recursive: true });
    fs.writeFileSync(path.join(orphanDir, "scratch.txt"), "abandoned\n");
    fs.mkdirSync(malformedDir, { recursive: true });
    fs.writeFileSync(path.join(malformedDir, ".graft-session-owner.json"), "not-json\n");
    fs.writeFileSync(uuidFile, "not-a-directory\n");
    fs.mkdirSync(path.join(unsafeMarkerDir, ".graft-session-owner.json"), { recursive: true });
    fs.mkdirSync(impossibleLegacyDir, { recursive: true });
    fs.writeFileSync(path.join(impossibleLegacyDir, "keep.txt"), "not-graft-owned\n");
    fs.mkdirSync(unrelatedDir, { recursive: true });
    fs.mkdirSync(linkTarget, { recursive: true });
    fs.writeFileSync(path.join(linkTarget, "keep.txt"), "preserved\n");
    if (process.platform !== "win32") {
      fs.symlinkSync(linkTarget, uuidLink, "dir");
    }
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    cleanups.push(() => {
      consoleError.mockRestore();
    });

    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
    });
    cleanups.push(() => daemon.close());

    expect(fs.existsSync(orphanDir)).toBe(false);
    expect(fs.existsSync(malformedDir)).toBe(true);
    expect(fs.readFileSync(uuidFile, "utf-8")).toBe("not-a-directory\n");
    expect(fs.readFileSync(path.join(impossibleLegacyDir, "keep.txt"), "utf-8"))
      .toBe("not-graft-owned\n");
    expect(fs.existsSync(unrelatedDir)).toBe(true);
    expect(fs.readFileSync(path.join(linkTarget, "keep.txt"), "utf-8")).toBe("preserved\n");
    if (process.platform !== "win32") {
      expect(fs.lstatSync(uuidLink).isSymbolicLink()).toBe(true);
    }
    const expectedPreservedEntries = [
      {
        entryName: path.basename(malformedDir),
        path: malformedDir,
        reason: "MALFORMED_OWNERSHIP_MARKER",
      },
      {
        entryName: path.basename(uuidFile),
        path: uuidFile,
        reason: "NOT_DIRECTORY",
      },
      {
        entryName: path.basename(impossibleLegacyDir),
        path: impossibleLegacyDir,
        reason: "UNKNOWN_ENTRY_NAME",
      },
      {
        entryName: path.basename(unrelatedDir),
        path: unrelatedDir,
        reason: "UNKNOWN_ENTRY_NAME",
      },
      {
        entryName: path.basename(unsafeMarkerDir),
        path: unsafeMarkerDir,
        reason: "UNSAFE_OWNERSHIP_MARKER",
      },
      ...(process.platform === "win32"
        ? []
        : [{
            entryName: path.basename(uuidLink),
            path: uuidLink,
            reason: "SYMBOLIC_LINK",
          }]),
    ];
    const sweep = await daemon.reapExpiredSessions();
    expect(sweep.preservedEntries).toHaveLength(expectedPreservedEntries.length);
    expect(sweep.preservedEntries).toEqual(expect.arrayContaining(expectedPreservedEntries));
    expect((await requestUnixJson(socketPath, "GET", "/healthz")).statusCode).toBe(200);
  });

  it("rejects a symlinked sessions root without touching its target", async () => {
    if (process.platform === "win32") return;
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-root-link-"));
    const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-root-target-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    const externalSession = path.join(externalRoot, "00000000-0000-4000-8000-000000000001");
    fs.mkdirSync(externalSession, { recursive: true });
    fs.writeFileSync(path.join(externalSession, "keep.txt"), "external\n");
    fs.symlinkSync(externalRoot, path.join(rootDir, "sessions"), "dir");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
      fs.rmSync(externalRoot, { recursive: true, force: true });
    });

    const startupError = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
    }).then(async (daemon) => {
      await daemon.close();
      return null;
    }, (error: unknown) => error);
    const externalSessionSurvived = fs.existsSync(externalSession);

    expect(startupError).toMatchObject({ code: "UNSAFE_DAEMON_SESSIONS_ROOT" });
    expect(externalSessionSurvived).toBe(true);
    expect(fs.readFileSync(path.join(externalSession, "keep.txt"), "utf-8")).toBe("external\n");
  });

  it("refuses a periodic orphan scan after the sessions root becomes a symlink", async () => {
    if (process.platform === "win32") return;
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-root-swap-"));
    const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-swap-target-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    const sessionId = "00000000-0000-4000-8000-000000000001";
    const externalSession = path.join(externalRoot, sessionId);
    fs.mkdirSync(externalSession, { recursive: true });
    fs.writeFileSync(path.join(externalSession, "keep.txt"), "external\n");
    await writeSessionOwnershipMarker(
      externalSession,
      "00000000-0000-4000-8000-000000000099",
      sessionId,
    );
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
      fs.rmSync(externalRoot, { recursive: true, force: true });
    });

    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
    });
    cleanups.push(() => daemon.close());

    const sessionsRoot = path.join(rootDir, "sessions");
    const parkedSessionsRoot = path.join(rootDir, "sessions-before-swap");
    fs.renameSync(sessionsRoot, parkedSessionsRoot);
    fs.symlinkSync(externalRoot, sessionsRoot, "dir");
    cleanups.push(() => {
      const stat = fs.lstatSync(sessionsRoot, { throwIfNoEntry: false });
      if (stat?.isSymbolicLink() === true) fs.unlinkSync(sessionsRoot);
      if (fs.existsSync(parkedSessionsRoot) && !fs.existsSync(sessionsRoot)) {
        fs.renameSync(parkedSessionsRoot, sessionsRoot);
      }
    });

    const sweep = await daemon.reapExpiredSessions();

    expect(sweep.orphanDirectoriesRemoved).toBe(0);
    expect(sweep.cleanupFailures).toHaveLength(1);
    expect(sweep.cleanupFailures[0]).toMatchObject({
      code: "ORPHAN_SCAN_FAILED",
      path: sessionsRoot,
    });
    expect(fs.readFileSync(path.join(externalSession, "keep.txt"), "utf-8")).toBe("external\n");
  });

  it.each([
    { phase: "enumeration", observer: "readdir" },
    { phase: "removal", observer: "readFile" },
  ] as const)("refuses an orphan scan when the sessions root changes during $phase", async ({ observer }) => {
    if (process.platform === "win32") return;
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-root-mid-scan-"));
    const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-root-mid-scan-target-"));
    const sessionsRoot = path.join(rootDir, "sessions");
    const parkedSessionsRoot = path.join(rootDir, "sessions-before-swap");
    const sessionId = "00000000-0000-4000-8000-000000000001";
    const originalSession = path.join(sessionsRoot, sessionId);
    const externalSession = path.join(externalRoot, sessionId);
    fs.mkdirSync(originalSession, { recursive: true });
    fs.mkdirSync(externalSession, { recursive: true });
    fs.writeFileSync(path.join(originalSession, "original.txt"), "original\n");
    fs.writeFileSync(path.join(externalSession, "external.txt"), "external\n");
    await writeSessionOwnershipMarker(
      originalSession,
      "00000000-0000-4000-8000-000000000098",
      sessionId,
    );
    await writeSessionOwnershipMarker(
      externalSession,
      "00000000-0000-4000-8000-000000000099",
      sessionId,
    );
    let swapped = false;
    const swapSessionsRoot = (): void => {
      if (swapped) return;
      fs.renameSync(sessionsRoot, parkedSessionsRoot);
      fs.symlinkSync(externalRoot, sessionsRoot, "dir");
      swapped = true;
    };
    if (observer === "readdir") {
      readdirObserver.mockImplementationOnce((directoryPath: fs.PathLike) => {
        if (directoryPath.toString() === sessionsRoot) swapSessionsRoot();
      });
    } else {
      const originalMarker = path.join(originalSession, ".graft-session-owner.json");
      readFileObserver.mockImplementationOnce((filePath: fs.PathLike) => {
        if (filePath.toString() === originalMarker) swapSessionsRoot();
      });
    }
    cleanups.push(() => {
      const stat = fs.lstatSync(sessionsRoot, { throwIfNoEntry: false });
      if (stat?.isSymbolicLink() === true) fs.unlinkSync(sessionsRoot);
      if (fs.existsSync(parkedSessionsRoot) && !fs.existsSync(sessionsRoot)) {
        fs.renameSync(parkedSessionsRoot, sessionsRoot);
      }
      fs.rmSync(rootDir, { recursive: true, force: true });
      fs.rmSync(externalRoot, { recursive: true, force: true });
    });

    const scanError = await removeSessionOrphanDirectories(
      sessionsRoot,
      new Set(),
      "preserve",
    ).then(() => null, (error: unknown) => error);
    const externalSurvived = fs.existsSync(externalSession);

    expect(scanError).toMatchObject({ code: "UNSAFE_DAEMON_SESSIONS_ROOT" });
    expect(externalSurvived).toBe(true);
    expect(fs.readFileSync(path.join(externalSession, "external.txt"), "utf-8")).toBe("external\n");
    expect(fs.readFileSync(
      path.join(parkedSessionsRoot, sessionId, "original.txt"),
      "utf-8",
    )).toBe("original\n");
  });

  it("protects a pending session construction from orphan discovery", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-pending-orphan-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let releaseConnect!: () => void;
    let markConnectEntered!: () => void;
    const connectEntered = new Promise<void>((resolve) => {
      markConnectEntered = resolve;
    });
    const connectGate = new Promise<void>((resolve) => {
      releaseConnect = resolve;
    });
    const connect = vi.spyOn(McpServer.prototype, "connect")
      .mockImplementationOnce(async () => {
        markConnectEntered();
        await connectGate;
        throw new Error("injected connection failure after pending sweep");
      });
    cleanups.push(() => {
      connect.mockRestore();
    });

    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
    });
    cleanups.push(() => daemon.close());
    cleanups.push(() => {
      releaseConnect();
    });
    const initializing = requestUnixJson(socketPath, "POST", "/mcp", {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "vitest", version: "0.0.0" },
      },
    });
    await connectEntered;

    const sessionsRoot = path.join(rootDir, "sessions");
    const pendingEntries = fs.readdirSync(sessionsRoot);
    expect(pendingEntries).toHaveLength(1);
    const pendingDir = path.join(sessionsRoot, pendingEntries[0]!);
    expect(fs.existsSync(path.join(pendingDir, ".graft-session-owner.json"))).toBe(true);

    expect(await daemon.reapExpiredSessions()).toMatchObject({
      sessionsRetired: 0,
      orphanDirectoriesRemoved: 0,
      cleanupFailures: [],
    });
    expect(fs.existsSync(pendingDir)).toBe(true);

    releaseConnect();
    expect((await initializing).statusCode).toBe(500);
    expect(fs.readdirSync(sessionsRoot)).toEqual([]);
  });

  it("protects construction admitted after an orphan scan begins", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-scan-before-open-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let scanCalls = 0;
    let releaseScan!: () => void;
    let markScanEntered!: () => void;
    const scanEntered = new Promise<void>((resolve) => {
      markScanEntered = resolve;
    });
    const scanGate = new Promise<void>((resolve) => {
      releaseScan = resolve;
    });
    const sessionStorage = {
      writeSessionOwnershipMarker,
      removeSessionDirectory,
      async removeSessionOrphanDirectories(
        sessionsRoot: string,
        liveSessionIds: ReadonlySet<string>,
        legacyUnmarkedPolicy: LegacyUnmarkedSessionPolicy,
      ) {
        scanCalls++;
        if (scanCalls > 1) {
          markScanEntered();
          await scanGate;
        }
        return removeSessionOrphanDirectories(
          sessionsRoot,
          liveSessionIds,
          legacyUnmarkedPolicy,
        );
      },
    };
    let releaseConnect!: () => void;
    let markConnectEntered!: () => void;
    const connectEntered = new Promise<void>((resolve) => {
      markConnectEntered = resolve;
    });
    const connectGate = new Promise<void>((resolve) => {
      releaseConnect = resolve;
    });
    type ConnectTransport = Parameters<McpServer["connect"]>[0];
    const originalConnect = Reflect.get(McpServer.prototype, "connect") as (
      this: McpServer,
      transport: ConnectTransport,
    ) => Promise<void>;
    const connect = vi.spyOn(McpServer.prototype, "connect")
      .mockImplementationOnce(async function(this: McpServer, transport: ConnectTransport) {
        markConnectEntered();
        await connectGate;
        await Reflect.apply(originalConnect, this, [transport]);
      });
    cleanups.push(() => {
      connect.mockRestore();
    });

    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
      sessionStorage,
    });
    cleanups.push(() => daemon.close());
    cleanups.push(() => {
      releaseScan();
      releaseConnect();
    });
    const sweeping = daemon.reapExpiredSessions();
    await scanEntered;
    const initializing = requestUnixJson(socketPath, "POST", "/mcp", {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "vitest", version: "0.0.0" },
      },
    });
    await connectEntered;
    const sessionsRoot = path.join(rootDir, "sessions");
    const pendingEntries = fs.readdirSync(sessionsRoot);
    expect(pendingEntries).toHaveLength(1);
    const pendingDir = path.join(sessionsRoot, pendingEntries[0]!);

    releaseScan();
    const sweepResult = await sweeping;
    const pendingDirectorySurvived = fs.existsSync(pendingDir);
    releaseConnect();
    await initializing;

    expect(sweepResult.orphanDirectoriesRemoved).toBe(0);
    expect(pendingDirectorySurvived).toBe(true);
  });

  it("prevents pending session construction from publishing after shutdown begins", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-pending-shutdown-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let releaseConnect!: () => void;
    let markConnectEntered!: () => void;
    const connectEntered = new Promise<void>((resolve) => {
      markConnectEntered = resolve;
    });
    const connectGate = new Promise<void>((resolve) => {
      releaseConnect = resolve;
    });
    type ConnectTransport = Parameters<McpServer["connect"]>[0];
    const originalConnect = Reflect.get(McpServer.prototype, "connect") as (
      this: McpServer,
      transport: ConnectTransport,
    ) => Promise<void>;
    const connect = vi.spyOn(McpServer.prototype, "connect")
      .mockImplementationOnce(async function(this: McpServer, transport: ConnectTransport) {
        markConnectEntered();
        await connectGate;
        await Reflect.apply(originalConnect, this, [transport]);
      });
    cleanups.push(() => {
      connect.mockRestore();
    });

    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
    });
    cleanups.push(() => daemon.close());
    cleanups.push(() => {
      releaseConnect();
    });
    const initializing = requestUnixJson(socketPath, "POST", "/mcp", {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "vitest", version: "0.0.0" },
      },
    });
    await connectEntered;

    const closing = daemon.close();
    releaseConnect();
    await Promise.all([initializing, closing]);

    expect(daemon.getHealthStatus().activeSessions).toBe(0);
    expect(fs.readdirSync(path.join(rootDir, "sessions"))).toEqual([]);
  });

  it("serializes overlapping manual session sweeps", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-sweep-single-flight-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let scanCalls = 0;
    let releaseScan!: () => void;
    let markScanEntered!: () => void;
    const scanEntered = new Promise<void>((resolve) => {
      markScanEntered = resolve;
    });
    const scanGate = new Promise<void>((resolve) => {
      releaseScan = resolve;
    });
    const sessionStorage = {
      writeSessionOwnershipMarker,
      removeSessionDirectory,
      async removeSessionOrphanDirectories(
        sessionsRoot: string,
        liveSessionIds: ReadonlySet<string>,
        legacyUnmarkedPolicy: LegacyUnmarkedSessionPolicy,
      ) {
        scanCalls++;
        if (scanCalls > 1) {
          markScanEntered();
          await scanGate;
        }
        return removeSessionOrphanDirectories(
          sessionsRoot,
          liveSessionIds,
          legacyUnmarkedPolicy,
        );
      },
    };

    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
      sessionStorage,
    });
    cleanups.push(() => daemon.close());
    cleanups.push(() => {
      releaseScan();
    });

    const firstSweep = daemon.reapExpiredSessions();
    await scanEntered;
    const secondSweep = daemon.reapExpiredSessions();
    releaseScan();
    const [firstResult, secondResult] = await Promise.all([firstSweep, secondSweep]);

    expect(scanCalls).toBe(2);
    expect(secondResult).toEqual(firstResult);
  });

  it("coalesces scheduled sweep waiters while a scan is active", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-scheduled-sweep-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    cleanups.push(() => {
      vi.useRealTimers();
    });
    let markDiagnosticEmitted!: () => void;
    const diagnosticEmitted = new Promise<void>((resolve) => {
      markDiagnosticEmitted = resolve;
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation((message: unknown) => {
      if (
        typeof message === "string"
        && message.startsWith("[graft] session reaper preserved entries:")
      ) {
        markDiagnosticEmitted();
      }
    });
    cleanups.push(() => {
      consoleError.mockRestore();
    });
    let scanCalls = 0;
    let releaseScan!: () => void;
    let markScanEntered!: () => void;
    let markScanFinished!: () => void;
    const scanEntered = new Promise<void>((resolve) => {
      markScanEntered = resolve;
    });
    const scanGate = new Promise<void>((resolve) => {
      releaseScan = resolve;
    });
    const scanFinished = new Promise<void>((resolve) => {
      markScanFinished = resolve;
    });
    const sessionStorage = {
      writeSessionOwnershipMarker,
      removeSessionDirectory,
      async removeSessionOrphanDirectories(
        sessionsRoot: string,
        _liveSessionIds: ReadonlySet<string>,
        _legacyUnmarkedPolicy: LegacyUnmarkedSessionPolicy,
      ) {
        scanCalls++;
        if (scanCalls === 1) return { removed: 0, failures: [], preservedEntries: [] };
        markScanEntered();
        await scanGate;
        markScanFinished();
        return {
          removed: 0,
          failures: [],
          preservedEntries: [{
            entryName: "operator-owned",
            path: path.join(sessionsRoot, "operator-owned"),
            reason: "UNKNOWN_ENTRY_NAME" as const,
          }],
        };
      },
    };

    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 1,
      sessionStorage,
    });
    cleanups.push(() => daemon.close());
    cleanups.push(() => {
      releaseScan();
    });

    await vi.advanceTimersByTimeAsync(1);
    await scanEntered;
    await vi.advanceTimersByTimeAsync(9);
    releaseScan();
    await scanFinished;
    await diagnosticEmitted;

    const scheduledDiagnostics = consoleError.mock.calls.filter(([message]) => {
      return typeof message === "string"
        && message.startsWith("[graft] session reaper preserved entries:");
    });
    expect(scanCalls).toBe(2);
    expect(scheduledDiagnostics).toHaveLength(1);
  });

  it("rejects session sweeps after daemon root ownership is released", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-post-close-sweep-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
    });
    await daemon.close();

    const eligibleDir = path.join(rootDir, "sessions", "00000000-0000-4000-8000-000000000005");
    fs.mkdirSync(eligibleDir, { recursive: true });
    await expect(daemon.reapExpiredSessions()).rejects.toMatchObject({
      code: "DAEMON_SESSION_HOST_CLOSED",
    });
    expect(fs.existsSync(eligibleDir)).toBe(true);
  });

  it("checks live root ownership before touching the candidate socket path", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-owner-order-"));
    const socketPath = path.join(rootDir, "candidate.sock");
    const processStartIdentity = await readProcessStartIdentity(process.pid);
    expect(processStartIdentity).not.toBeNull();
    fs.writeFileSync(socketPath, "operator-owned\n");
    fs.writeFileSync(path.join(rootDir, "daemon-owner.json"), `${JSON.stringify({
      schemaVersion: 2,
      instanceId: "00000000-0000-4000-8000-000000000099",
      pid: process.pid,
      processStartIdentity,
      socketPath: path.join(rootDir, "owned.sock"),
    })}\n`);
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });

    await expect(startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
    })).rejects.toMatchObject({ code: "DAEMON_ROOT_ALREADY_OWNED" });
    expect(fs.readFileSync(socketPath, "utf-8")).toBe("operator-owned\n");
  });

  it("binds the default endpoint with admission closed before legacy orphan cleanup", async () => {
    if (process.platform === "win32") return;
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-default-bind-first-"));
    const socketPath = path.join(rootDir, "mcp.sock");
    const legacySessionDir = path.join(
      rootDir,
      "sessions",
      "00000000-0000-4000-8000-000000000001",
    );
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let markScanEntered!: () => void;
    let releaseScan!: () => void;
    const scanEntered = new Promise<void>((resolve) => {
      markScanEntered = resolve;
    });
    const scanGate = new Promise<void>((resolve) => {
      releaseScan = resolve;
    });
    cleanups.push(() => {
      releaseScan();
    });
    const sessionStorage = {
      writeSessionOwnershipMarker,
      removeSessionDirectory,
      async removeSessionOrphanDirectories(
        sessionsRoot: string,
        liveSessionIds: ReadonlySet<string>,
        legacyUnmarkedPolicy: LegacyUnmarkedSessionPolicy,
      ) {
        markScanEntered();
        await scanGate;
        return removeSessionOrphanDirectories(
          sessionsRoot,
          liveSessionIds,
          legacyUnmarkedPolicy,
        );
      },
    };

    const starting = startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
      sessionStorage,
    });
    await scanEntered;

    const competingServer = http.createServer((_request, response) => {
      response.writeHead(200);
      response.end();
    });
    const competingError = await new Promise<(Error & { code?: string }) | null>((resolve) => {
      competingServer.once("error", (error: Error & { code?: string }) => {
        resolve(error);
      });
      competingServer.listen(socketPath, () => {
        resolve(null);
      });
    });
    if (competingError === null) {
      cleanups.push(() => {
        return new Promise<void>((resolve, reject) => {
          competingServer.close((error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      });
      fs.mkdirSync(legacySessionDir, { recursive: true });
      fs.writeFileSync(path.join(legacySessionDir, "keep.txt"), "live-legacy-session\n");
    }

    const admissionStatus = (await requestUnixJson(socketPath, "GET", "/healthz")).statusCode;
    releaseScan();
    const startup = await starting.then(
      (daemon) => ({ daemon, error: null }),
      (error: unknown) => ({ daemon: null, error }),
    );
    if (startup.daemon !== null) {
      const startedDaemon = startup.daemon;
      cleanups.push(() => startedDaemon.close());
    }

    expect(competingError).toMatchObject({ code: "EADDRINUSE" });
    expect(admissionStatus).toBe(503);
    expect(startup.error).toBeNull();
    expect(startup.daemon).not.toBeNull();
    expect(fs.existsSync(legacySessionDir)).toBe(competingError === null);
  });

  it("refuses custom-endpoint startup while a legacy daemon endpoint is live", async () => {
    if (process.platform === "win32") return;
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-legacy-live-"));
    const legacySocketPath = path.join(rootDir, "mcp.sock");
    const customSocketPath = path.join(rootDir, "custom.sock");
    const legacySessionDir = path.join(
      rootDir,
      "sessions",
      "00000000-0000-4000-8000-000000000001",
    );
    fs.mkdirSync(legacySessionDir, { recursive: true });
    fs.writeFileSync(path.join(legacySessionDir, "keep.txt"), "live-legacy-session\n");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });

    const legacyServer = http.createServer((_request, response) => {
      response.end();
    });
    await new Promise<void>((resolve, reject) => {
      legacyServer.once("error", reject);
      legacyServer.listen(legacySocketPath, resolve);
    });
    cleanups.push(() => {
      return new Promise<void>((resolve, reject) => {
        legacyServer.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    });

    const startupError = await startDaemonServer({
      graftDir: rootDir,
      socketPath: customSocketPath,
      sessionReaperIntervalMs: 0,
    }).then(async (daemon) => {
      await daemon.close();
      return null;
    }, (error: unknown) => error);

    expect(startupError).toMatchObject({ code: "DAEMON_LEGACY_ENDPOINT_ACTIVE" });
    expect(fs.readFileSync(path.join(legacySessionDir, "keep.txt"), "utf-8"))
      .toBe("live-legacy-session\n");
    expect(fs.existsSync(path.join(rootDir, "daemon-owner.json"))).toBe(false);
    expect(fs.existsSync(customSocketPath)).toBe(false);
  });

  it("preserves unmarked legacy sessions during custom-endpoint sweeps", async () => {
    if (process.platform === "win32") return;
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-legacy-late-live-"));
    const legacySocketPath = path.join(rootDir, "mcp.sock");
    const customSocketPath = path.join(rootDir, "custom.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });

    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath: customSocketPath,
      sessionReaperIntervalMs: 0,
    });
    cleanups.push(() => daemon.close());

    const legacySessionDir = path.join(
      rootDir,
      "sessions",
      "00000000-0000-4000-8000-000000000001",
    );
    fs.mkdirSync(legacySessionDir, { recursive: true });
    fs.writeFileSync(path.join(legacySessionDir, "keep.txt"), "live-legacy-session\n");
    const legacyServer = http.createServer((_request, response) => {
      response.end();
    });
    await new Promise<void>((resolve, reject) => {
      legacyServer.once("error", reject);
      legacyServer.listen(legacySocketPath, resolve);
    });
    cleanups.push(() => {
      return new Promise<void>((resolve, reject) => {
        legacyServer.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    });

    const sweep = await daemon.reapExpiredSessions();

    expect(sweep.orphanDirectoriesRemoved).toBe(0);
    expect(sweep.preservedEntries).toContainEqual({
      entryName: path.basename(legacySessionDir),
      path: legacySessionDir,
      reason: "LEGACY_SESSION_UNMARKED",
    });
    expect(fs.readFileSync(path.join(legacySessionDir, "keep.txt"), "utf-8"))
      .toBe("live-legacy-session\n");
  });

  it("restores a newer owner displaced by a delayed stale takeover", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-owner-race-"));
    const ownerPath = path.join(rootDir, "daemon-owner.json");
    const staleOwner = {
      schemaVersion: 2 as const,
      instanceId: "00000000-0000-4000-8000-000000000001",
      pid: 1,
      processStartIdentity: "boot-a:100",
      socketPath: path.join(rootDir, "stale.sock"),
    };
    const newerOwner = {
      schemaVersion: 2 as const,
      instanceId: "00000000-0000-4000-8000-000000000002",
      pid: process.pid,
      processStartIdentity: "boot-a:200",
      socketPath: path.join(rootDir, "newer.sock"),
    };
    fs.writeFileSync(ownerPath, `${JSON.stringify(newerOwner)}\n`);
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });

    await expect(quarantineDaemonRootOwner(ownerPath, staleOwner, "stale"))
      .rejects.toMatchObject({
        code: "DAEMON_ROOT_ALREADY_OWNED",
      });

    expect(JSON.parse(fs.readFileSync(ownerPath, "utf-8"))).toEqual(newerOwner);
    expect(fs.readdirSync(rootDir)).toEqual(["daemon-owner.json"]);
  });

  it("holds the root owner claim through displaced-owner restoration", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-owner-three-way-race-"));
    const ownerPath = path.join(rootDir, "daemon-owner.json");
    const staleOwner = {
      schemaVersion: 2 as const,
      instanceId: "00000000-0000-4000-8000-000000000001",
      pid: 1,
      processStartIdentity: "boot-a:100",
      socketPath: path.join(rootDir, "stale.sock"),
    };
    const newerOwner = {
      schemaVersion: 2 as const,
      instanceId: "00000000-0000-4000-8000-000000000002",
      pid: process.pid,
      processStartIdentity: "boot-a:200",
      socketPath: path.join(rootDir, "newer.sock"),
    };
    const thirdOwner = {
      schemaVersion: 2 as const,
      instanceId: "00000000-0000-4000-8000-000000000003",
      pid: process.pid,
      processStartIdentity: "boot-a:300",
      socketPath: path.join(rootDir, "third.sock"),
    };
    fs.writeFileSync(ownerPath, `${JSON.stringify(newerOwner)}\n`);
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });

    let observeOwnerRename!: () => void;
    const ownerRenamed = new Promise<void>((resolve) => {
      observeOwnerRename = resolve;
    });
    let releaseOwnerRename!: () => void;
    const ownerRenameRelease = new Promise<void>((resolve) => {
      releaseOwnerRename = resolve;
    });
    let observeCompetingMutation!: () => void;
    const competingMutationObserved = new Promise<void>((resolve) => {
      observeCompetingMutation = resolve;
    });
    let ownerRenameHeld = false;
    let competingMutationSeen = false;
    const noteCompetingMutation = (): void => {
      if (competingMutationSeen) return;
      competingMutationSeen = true;
      observeCompetingMutation();
    };

    renameObserver.mockImplementation(async (oldPath, newPath, error) => {
      const oldName = String(oldPath);
      const newName = String(newPath);
      if (error === null && oldName === ownerPath && newName.startsWith(`${ownerPath}.stale-`)) {
        ownerRenameHeld = true;
        observeOwnerRename();
        await ownerRenameRelease;
        return;
      }
      if (ownerRenameHeld && newName === `${ownerPath}.claim`) {
        noteCompetingMutation();
      }
    });
    linkObserver.mockImplementation((existingPath, newPath) => {
      if (
        ownerRenameHeld
        && String(newPath) === ownerPath
        && String(existingPath).startsWith(`${ownerPath}.candidate-${thirdOwner.instanceId}-`)
      ) {
        noteCompetingMutation();
      }
    });

    const displacedOwner = quarantineDaemonRootOwner(ownerPath, staleOwner, "stale")
      .then(() => null, (error: unknown) => error);
    await ownerRenamed;
    const thirdPublished = publishDaemonRootOwner(ownerPath, thirdOwner);
    await competingMutationObserved;
    releaseOwnerRename();

    const [displacedOwnerError, didPublishThird] = await Promise.all([
      displacedOwner,
      thirdPublished,
    ]);
    expect(flattenErrors(displacedOwnerError)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "DAEMON_ROOT_ALREADY_OWNED" }),
    ]));
    expect(didPublishThird).toBe(false);
    expect(JSON.parse(fs.readFileSync(ownerPath, "utf-8"))).toEqual(newerOwner);
  });

  it("retains a deterministic tombstone when recovering a dead owner claim", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-owner-stale-claim-"));
    const ownerPath = path.join(rootDir, "daemon-owner.json");
    const staleClaim = {
      schemaVersion: 1 as const,
      claimId: "00000000-0000-4000-8000-000000000001",
      pid: 2_147_483_647,
      processStartIdentity: "dead-process:100",
    };
    const claimPath = `${ownerPath}.claim`;
    fs.mkdirSync(claimPath, { recursive: true });
    fs.writeFileSync(path.join(claimPath, "claim.json"), `${JSON.stringify(staleClaim)}\n`);
    const owner = {
      schemaVersion: 2 as const,
      instanceId: "00000000-0000-4000-8000-000000000002",
      pid: process.pid,
      processStartIdentity: "live-process:200",
      socketPath: path.join(rootDir, "daemon.sock"),
    };
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });

    expect(await publishDaemonRootOwner(ownerPath, owner)).toBe(true);

    const stalePath = `${claimPath}.stale-${staleClaim.claimId}`;
    expect(fs.existsSync(claimPath)).toBe(false);
    expect(JSON.parse(fs.readFileSync(path.join(stalePath, "claim.json"), "utf-8")))
      .toEqual(staleClaim);
    expect(JSON.parse(fs.readFileSync(ownerPath, "utf-8"))).toEqual(owner);
  });

  it("publishes a complete root owner without replacing an incumbent", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-owner-publish-"));
    const ownerPath = path.join(rootDir, "daemon-owner.json");
    const firstOwner = {
      schemaVersion: 2 as const,
      instanceId: "00000000-0000-4000-8000-000000000001",
      pid: process.pid,
      processStartIdentity: "boot-a:100",
      socketPath: path.join(rootDir, "first.sock"),
    };
    const secondOwner = {
      schemaVersion: 2 as const,
      instanceId: "00000000-0000-4000-8000-000000000002",
      pid: process.pid,
      processStartIdentity: "boot-a:100",
      socketPath: path.join(rootDir, "second.sock"),
    };
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });

    expect(await publishDaemonRootOwner(ownerPath, firstOwner)).toBe(true);
    expect(await publishDaemonRootOwner(ownerPath, secondOwner)).toBe(false);

    expect(JSON.parse(fs.readFileSync(ownerPath, "utf-8"))).toEqual(firstOwner);
    expect(fs.readdirSync(rootDir)).toEqual(["daemon-owner.json"]);
  });

  it("distinguishes a recycled owner pid from the original daemon process", async () => {
    const owner = {
      schemaVersion: 2 as const,
      instanceId: "00000000-0000-4000-8000-000000000001",
      pid: 4242,
      processStartIdentity: "boot-a:100",
      socketPath: "/inactive/graft.sock",
    };
    const inactiveRecycledProcess = {
      socketHasActiveListener: () => Promise.resolve(false),
      readProcessStartIdentity: () => Promise.resolve("boot-a:200"),
    };
    const concurrentOriginalProcess = {
      socketHasActiveListener: () => Promise.resolve(false),
      readProcessStartIdentity: () => Promise.resolve("boot-a:100"),
    };

    expect(await daemonRootOwnerIsLive(owner, inactiveRecycledProcess)).toBe(false);
    expect(await daemonRootOwnerIsLive(owner, concurrentOriginalProcess)).toBe(true);
  });

  it("refuses a second live owner without touching its session directory", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-reaper-owner-"));
    const socketPathA = path.join(rootDir, "daemon-a.sock");
    const socketPathB = path.join(rootDir, "daemon-b.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });

    const daemonA = await startDaemonServer({
      graftDir: rootDir,
      socketPath: socketPathA,
      sessionReaperIntervalMs: 0,
    });
    cleanups.push(() => daemonA.close());
    const initialize = await requestUnixJson(socketPathA, "POST", "/mcp", {
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

    await expect((async () => {
      const daemonB = await startDaemonServer({
        graftDir: rootDir,
        socketPath: socketPathB,
        sessionReaperIntervalMs: 0,
      });
      await daemonB.close();
    })()).rejects.toMatchObject({ code: "DAEMON_ROOT_ALREADY_OWNED" });

    expect(fs.existsSync(sessionDir)).toBe(true);
    expect(fs.existsSync(socketPathB)).toBe(false);
    expect((await requestUnixJson(socketPathA, "GET", "/healthz")).statusCode).toBe(200);
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
    const reapedMid = await daemon.reapExpiredSessions();
    expect(reapedMid).toMatchObject({ sessionsRetired: 0 });
    expect(fs.existsSync(sessionDir)).toBe(true);

    // 3. Advance time by another 6 seconds (total 11s > 10s TTL) and sweep
    currentTimeMs += 6_000;
    const reapedAfter = await daemon.reapExpiredSessions();
    expect(reapedAfter).toMatchObject({
      sessionsRetired: 1,
      liveDirectoriesRemoved: 1,
      orphanDirectoriesRemoved: 0,
      cleanupFailures: [],
    });

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

  it("runs shared terminal side effects once across idle, transport, and shutdown signals", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-reaper-terminal-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let removalCalls = 0;
    const sessionStorage = {
      writeSessionOwnershipMarker,
      removeSessionOrphanDirectories,
      async removeSessionDirectory(sessionDir: string): Promise<boolean> {
        removalCalls++;
        if (removalCalls > 1) return false;
        return removeSessionDirectory(sessionDir);
      },
    };
    const unregisterTransport = vi.spyOn(DaemonControlPlane.prototype, "unregisterTransport");
    type ConnectTransport = Parameters<McpServer["connect"]>[0];
    const originalConnect = Reflect.get(McpServer.prototype, "connect") as (
      this: McpServer,
      transport: ConnectTransport,
    ) => Promise<void>;
    let connectedTransport: ConnectTransport | undefined;
    const connect = vi.spyOn(McpServer.prototype, "connect")
      .mockImplementationOnce(async function(this: McpServer, transport: ConnectTransport) {
        connectedTransport = transport;
        await Reflect.apply(originalConnect, this, [transport]);
      });
    let releaseProtocolClose!: () => void;
    let markProtocolCloseStarted!: () => void;
    const protocolCloseStarted = new Promise<void>((resolve) => {
      markProtocolCloseStarted = resolve;
    });
    const protocolCloseGate = new Promise<void>((resolve) => {
      releaseProtocolClose = resolve;
    });
    const protocolClose = vi.spyOn(McpServer.prototype, "close")
      .mockImplementation(async () => {
        markProtocolCloseStarted();
        await protocolCloseGate;
      });
    cleanups.push(() => {
      unregisterTransport.mockRestore();
      connect.mockRestore();
      protocolClose.mockRestore();
    });

    let currentTimeMs = 1_000_000;
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionInactivityTtlMs: 10_000,
      sessionReaperIntervalMs: 0,
      nowMs: () => currentTimeMs,
      sessionStorage,
    });
    cleanups.push(() => daemon.close());
    cleanups.push(() => {
      releaseProtocolClose();
    });
    const sessionId = await initializeDaemonSession(socketPath, 1);
    const sessionDir = path.join(rootDir, "sessions", sessionId);
    const capturedTransport = connectedTransport;
    if (capturedTransport === undefined) throw new Error("MCP transport was not captured");
    unregisterTransport.mockClear();

    currentTimeMs += 10_001;
    const reaping = daemon.reapExpiredSessions();
    await protocolCloseStarted;
    capturedTransport.onerror?.(new Error("concurrent transport failure"));
    const closing = daemon.close();
    let closeSettled = false;
    void closing.then(() => {
      closeSettled = true;
    });
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    expect(closeSettled).toBe(false);
    releaseProtocolClose();
    const [reaped] = await Promise.all([reaping, closing]);

    expect(reaped).toMatchObject({ sessionsRetired: 1, cleanupFailures: [] });
    expect(unregisterTransport).toHaveBeenCalledTimes(1);
    expect(unregisterTransport).toHaveBeenCalledWith(sessionId);
    expect(protocolClose).toHaveBeenCalledTimes(1);
    expect(removalCalls).toBe(1);
    expect(fs.existsSync(sessionDir)).toBe(false);
  });

  it("reserves a terminating identity and ignores its late callback after reuse", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-reaper-aba-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let releaseRemoval!: () => void;
    let markRemovalStarted!: () => void;
    let markRemovalFinished!: () => void;
    const removalStarted = new Promise<void>((resolve) => {
      markRemovalStarted = resolve;
    });
    const removalFinished = new Promise<void>((resolve) => {
      markRemovalFinished = resolve;
    });
    const removalGate = new Promise<void>((resolve) => {
      releaseRemoval = resolve;
    });
    let removalCalls = 0;
    const sessionStorage = {
      writeSessionOwnershipMarker,
      removeSessionOrphanDirectories,
      async removeSessionDirectory(sessionDir: string): Promise<boolean> {
        removalCalls++;
        if (removalCalls === 1) {
          markRemovalStarted();
          await removalGate;
        }
        const removed = await removeSessionDirectory(sessionDir);
        if (removalCalls === 1) markRemovalFinished();
        return removed;
      },
    };
    type ConnectTransport = Parameters<McpServer["connect"]>[0];
    const originalConnect = Reflect.get(McpServer.prototype, "connect") as (
      this: McpServer,
      transport: ConnectTransport,
    ) => Promise<void>;
    const connectedTransports: ConnectTransport[] = [];
    const connect = vi.spyOn(McpServer.prototype, "connect")
      .mockImplementation(async function(this: McpServer, transport: ConnectTransport) {
        connectedTransports.push(transport);
        await Reflect.apply(originalConnect, this, [transport]);
      });
    cleanups.push(() => {
      connect.mockRestore();
    });

    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
      sessionStorage,
    });
    cleanups.push(() => daemon.close());
    cleanups.push(() => {
      releaseRemoval();
    });
    const repeatedSessionId = "00000000-0000-4000-8000-000000000001";
    randomUUIDMock.mockImplementationOnce(() => repeatedSessionId);
    expect(await initializeDaemonSession(socketPath, 1)).toBe(repeatedSessionId);
    const firstTransport = connectedTransports[0];
    if (firstTransport === undefined) throw new Error("First MCP transport was not captured");

    const deleting = requestUnixJson(socketPath, "DELETE", "/mcp", undefined, {
      "mcp-session-id": repeatedSessionId,
    });
    await removalStarted;
    randomUUIDMock.mockImplementationOnce(() => repeatedSessionId);
    const collision = await requestUnixJson(socketPath, "POST", "/mcp", {
      jsonrpc: "2.0",
      id: 2,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "vitest", version: "0.0.0" },
      },
    });
    releaseRemoval();
    await deleting;
    await removalFinished;
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    expect(collision.statusCode).toBe(500);
    expect((JSON.parse(collision.text) as { error: { code: number } }).error.code).toBe(-32603);

    randomUUIDMock.mockImplementationOnce(() => repeatedSessionId);
    expect(await initializeDaemonSession(socketPath, 3)).toBe(repeatedSessionId);
    firstTransport.onerror?.(new Error("late error from prior transport"));
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    expect(daemon.getHealthStatus().activeSessions).toBe(1);
    expect(fs.existsSync(path.join(rootDir, "sessions", repeatedSessionId))).toBe(true);
    const ping = await requestUnixJson(socketPath, "POST", "/mcp", {
      jsonrpc: "2.0",
      id: 4,
      method: "ping",
      params: {},
    }, {
      "mcp-session-id": repeatedSessionId,
    });
    expect(ping.statusCode).toBe(200);
  });

  it("protects terminating session directories from orphan discovery", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-terminating-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let releaseRemoval!: () => void;
    let markRemovalStarted!: () => void;
    const removalStarted = new Promise<void>((resolve) => {
      markRemovalStarted = resolve;
    });
    const removalGate = new Promise<void>((resolve) => {
      releaseRemoval = resolve;
    });
    let scanCalls = 0;
    const sweepLiveSessionIds: ReadonlySet<string>[] = [];
    const sessionStorage = {
      writeSessionOwnershipMarker,
      async removeSessionDirectory(sessionDir: string): Promise<boolean> {
        markRemovalStarted();
        await removalGate;
        return removeSessionDirectory(sessionDir);
      },
      removeSessionOrphanDirectories(
        _sessionsRoot: string,
        liveSessionIds: ReadonlySet<string>,
        _legacyUnmarkedPolicy: LegacyUnmarkedSessionPolicy,
      ) {
        scanCalls++;
        if (scanCalls > 1) sweepLiveSessionIds.push(new Set(liveSessionIds));
        return Promise.resolve({ removed: 0, failures: [], preservedEntries: [] });
      },
    };

    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
      sessionStorage,
    });
    cleanups.push(() => daemon.close());
    cleanups.push(() => {
      releaseRemoval();
    });
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

    const deleting = requestUnixJson(socketPath, "DELETE", "/mcp", undefined, {
      "mcp-session-id": sessionId!,
    });
    await removalStarted;
    await daemon.reapExpiredSessions();
    const protectedDuringTermination = sweepLiveSessionIds.some((ids) => ids.has(sessionId!));
    releaseRemoval();
    await deleting;

    expect(protectedDuringTermination).toBe(true);
  });

  it("reports cleanup failures from transport-triggered termination", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-callback-failure-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let markRemovalAttempted!: () => void;
    const removalAttempted = new Promise<void>((resolve) => {
      markRemovalAttempted = resolve;
    });
    const sessionStorage = {
      writeSessionOwnershipMarker,
      removeSessionOrphanDirectories,
      removeSessionDirectory(): Promise<boolean> {
        markRemovalAttempted();
        return Promise.reject(Object.assign(new Error("injected busy directory"), { code: "EBUSY" }));
      },
    };
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
      sessionStorage,
    });
    cleanups.push(() => daemon.close());
    const protocolClose = vi.spyOn(McpServer.prototype, "close");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    cleanups.push(() => {
      protocolClose.mockRestore();
      consoleError.mockRestore();
    });
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

    await requestUnixJson(socketPath, "DELETE", "/mcp", undefined, {
      "mcp-session-id": sessionId!,
    });
    await removalAttempted;
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    const prefix = "[graft] daemon session termination cleanup failures: ";
    const diagnostic = consoleError.mock.calls.find(([message]) => {
      return typeof message === "string" && message.startsWith(prefix);
    });
    expect(diagnostic).toBeDefined();
    const report = JSON.parse((diagnostic?.[0] as string).slice(prefix.length)) as unknown;
    expect(report).toMatchObject({
      reason: "transport_close",
      sessionId,
      cleanupFailures: [{
        code: "SESSION_DIRECTORY_REMOVE_FAILED",
        sessionId,
        retryable: true,
      }],
    });
    expect(protocolClose).not.toHaveBeenCalled();
  });

  it("converges transport errors on the shared session termination operation", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-transport-error-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    type ConnectTransport = Parameters<McpServer["connect"]>[0];
    const originalConnect = Reflect.get(McpServer.prototype, "connect") as (
      this: McpServer,
      transport: ConnectTransport,
    ) => Promise<void>;
    let connectedTransport: ConnectTransport | undefined;
    const connect = vi.spyOn(McpServer.prototype, "connect")
      .mockImplementationOnce(async function(this: McpServer, transport: ConnectTransport) {
        connectedTransport = transport;
        await Reflect.apply(originalConnect, this, [transport]);
      });
    cleanups.push(() => {
      connect.mockRestore();
    });

    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
    });
    cleanups.push(() => daemon.close());
    const sessionId = await initializeDaemonSession(socketPath, 1);
    const sessionDir = path.join(rootDir, "sessions", sessionId);
    const capturedTransport = connectedTransport;
    if (capturedTransport === undefined) throw new Error("MCP transport was not captured");

    capturedTransport.onerror?.(new Error("injected transport error"));
    await vi.waitFor(() => {
      expect(daemon.getHealthStatus().activeSessions).toBe(0);
    });

    expect(fs.existsSync(sessionDir)).toBe(false);
    const response = await requestUnixJson(socketPath, "POST", "/mcp", {
      jsonrpc: "2.0",
      id: 2,
      method: "ping",
      params: {},
    }, {
      "mcp-session-id": sessionId,
    });
    expect(response.statusCode).toBe(500);
    expect((JSON.parse(response.text) as { error: { code: number } }).error.code).toBe(-32000);
  });

  it("waits for transport-triggered termination before closing daemon resources", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-close-fence-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let releaseRemoval!: () => void;
    let markRemovalStarted!: () => void;
    const removalStarted = new Promise<void>((resolve) => {
      markRemovalStarted = resolve;
    });
    const removalGate = new Promise<void>((resolve) => {
      releaseRemoval = resolve;
    });
    const sessionStorage = {
      writeSessionOwnershipMarker,
      removeSessionOrphanDirectories,
      async removeSessionDirectory(sessionDir: string): Promise<boolean> {
        markRemovalStarted();
        await removalGate;
        return removeSessionDirectory(sessionDir);
      },
    };
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
      sessionStorage,
    });
    cleanups.push(() => daemon.close());
    cleanups.push(() => {
      releaseRemoval();
    });
    const monitorClose = vi.spyOn(PersistentMonitorRuntime.prototype, "close");
    cleanups.push(() => {
      monitorClose.mockRestore();
    });
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

    const deleting = requestUnixJson(socketPath, "DELETE", "/mcp", undefined, {
      "mcp-session-id": sessionId!,
    });
    await removalStarted;
    const closing = daemon.close();
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    const advancedPastSessionHost = monitorClose.mock.calls.length > 0;
    releaseRemoval();
    await Promise.all([deleting, closing]);

    expect(advancedPastSessionHost).toBe(false);
    expect(monitorClose).toHaveBeenCalledTimes(1);
  });

  it("reports failed cleanup and retries the resulting orphan on the next sweep", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-reaper-retry-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let currentTimeMs = 1_000_000;
    let failNextRemoval = true;
    const sessionStorage = {
      writeSessionOwnershipMarker,
      removeSessionOrphanDirectories,
      async removeSessionDirectory(directoryPath: string): Promise<boolean> {
        if (failNextRemoval) {
          failNextRemoval = false;
          throw Object.assign(new Error("injected busy directory"), { code: "EBUSY" });
        }
        await fsPromises.rm(directoryPath, { recursive: true, force: true });
        return true;
      },
    };

    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionInactivityTtlMs: 10_000,
      sessionReaperIntervalMs: 0,
      nowMs: () => currentTimeMs,
      sessionStorage,
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

    currentTimeMs += 10_001;
    expect(await daemon.reapExpiredSessions()).toMatchObject({
      sessionsRetired: 1,
      liveDirectoriesRemoved: 0,
      orphanDirectoriesRemoved: 0,
      cleanupFailures: [{
        code: "SESSION_DIRECTORY_REMOVE_FAILED",
        sessionId,
        path: sessionDir,
        retryable: true,
      }],
    });
    expect(fs.existsSync(sessionDir)).toBe(true);

    expect(await daemon.reapExpiredSessions()).toMatchObject({
      sessionsRetired: 0,
      liveDirectoriesRemoved: 0,
      orphanDirectoriesRemoved: 1,
      cleanupFailures: [],
    });
    expect(fs.existsSync(sessionDir)).toBe(false);
  });

  it("marks an unsafe live-session path refusal as non-retryable", async () => {
    if (process.platform === "win32") return;
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-unsafe-live-path-"));
    const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-unsafe-target-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    fs.writeFileSync(path.join(externalRoot, "keep.txt"), "external\n");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
      fs.rmSync(externalRoot, { recursive: true, force: true });
    });
    let currentTimeMs = 1_000_000;
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionInactivityTtlMs: 10_000,
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
    fs.renameSync(sessionDir, path.join(rootDir, "displaced-session"));
    fs.symlinkSync(externalRoot, sessionDir, "dir");

    currentTimeMs += 10_001;
    expect(await daemon.reapExpiredSessions()).toMatchObject({
      sessionsRetired: 1,
      liveDirectoriesRemoved: 0,
      orphanDirectoriesRemoved: 0,
      cleanupFailures: [{
        code: "SESSION_DIRECTORY_REMOVE_FAILED",
        sessionId,
        path: sessionDir,
        retryable: false,
      }],
    });
    expect(await daemon.reapExpiredSessions()).toMatchObject({
      sessionsRetired: 0,
      orphanDirectoriesRemoved: 0,
      cleanupFailures: [],
      preservedEntries: [{
        entryName: sessionId,
        path: sessionDir,
        reason: "SYMBOLIC_LINK",
      }],
    });
    expect(fs.readFileSync(path.join(externalRoot, "keep.txt"), "utf-8")).toBe("external\n");
  });

  it("reports protocol and fallback transport close failures as non-retryable", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-close-failures-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let currentTimeMs = 1_000_000;
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionInactivityTtlMs: 10_000,
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

    const protocolClose = vi.spyOn(McpServer.prototype, "close")
      .mockRejectedValueOnce(new Error("injected protocol close failure"));
    const transportClose = vi.spyOn(StreamableHTTPServerTransport.prototype, "close")
      .mockRejectedValueOnce(new Error("injected fallback transport close failure"));
    cleanups.push(() => {
      protocolClose.mockRestore();
      transportClose.mockRestore();
    });

    currentTimeMs += 10_001;
    expect(await daemon.reapExpiredSessions()).toMatchObject({
      sessionsRetired: 1,
      liveDirectoriesRemoved: 1,
      cleanupFailures: [
        {
          code: "SESSION_PROTOCOL_CLOSE_FAILED",
          sessionId,
          retryable: false,
        },
        {
          code: "SESSION_TRANSPORT_CLOSE_FAILED",
          sessionId,
          retryable: false,
        },
      ],
    });
  });

  it("rejects daemon shutdown when session cleanup fails", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-shutdown-failure-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const sessionStorage = {
      writeSessionOwnershipMarker,
      removeSessionOrphanDirectories,
      removeSessionDirectory(): Promise<boolean> {
        return Promise.reject(Object.assign(new Error("injected busy directory"), { code: "EBUSY" }));
      },
    };

    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionInactivityTtlMs: 10_000,
      sessionReaperIntervalMs: 0,
      sessionStorage,
    });
    await requestUnixJson(socketPath, "POST", "/mcp", {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "vitest", version: "0.0.0" },
      },
    });

    await expect(daemon.close()).rejects.toThrow("Failed to close the Graft daemon cleanly");
  });

  it("reports one cleanup failure when shutdown overlaps its owning sweep", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-shutdown-sweep-failure-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let currentTimeMs = 1_000_000;
    let markRemovalStarted!: () => void;
    let releaseRemoval!: () => void;
    const removalStarted = new Promise<void>((resolve) => {
      markRemovalStarted = resolve;
    });
    const removalGate = new Promise<void>((resolve) => {
      releaseRemoval = resolve;
    });
    cleanups.push(() => {
      releaseRemoval();
    });
    const sessionStorage = {
      writeSessionOwnershipMarker,
      removeSessionOrphanDirectories,
      async removeSessionDirectory(): Promise<boolean> {
        markRemovalStarted();
        await removalGate;
        throw Object.assign(new Error("injected busy directory"), { code: "EBUSY" });
      },
    };
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionInactivityTtlMs: 10_000,
      sessionReaperIntervalMs: 0,
      nowMs: () => currentTimeMs,
      sessionStorage,
    });
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

    currentTimeMs += 10_001;
    const sweeping = daemon.reapExpiredSessions();
    await removalStarted;
    const closing = daemon.close().then(
      () => null,
      (error: unknown) => error,
    );
    releaseRemoval();

    expect(await sweeping).toMatchObject({
      sessionsRetired: 1,
      cleanupFailures: [{
        code: "SESSION_DIRECTORY_REMOVE_FAILED",
        sessionId,
      }],
    });
    const closeError = await closing;
    expect(closeError).toBeInstanceOf(AggregateError);
    const matchingFailures = flattenErrors(closeError).filter((error) => {
      return error instanceof Error
        && "code" in error
        && error.code === "SESSION_DIRECTORY_REMOVE_FAILED"
        && "sessionId" in error
        && error.sessionId === sessionId;
    });
    expect(matchingFailures).toHaveLength(1);
  });

  it("reports and consumes signal-triggered shutdown failures", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-signal-failure-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    const signalListenersBefore = new Set(process.listeners("SIGTERM"));
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    cleanups.push(() => {
      process.exitCode = previousExitCode;
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    cleanups.push(() => {
      consoleError.mockRestore();
    });
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (error: unknown): void => {
      unhandledRejections.push(error);
    };
    process.on("unhandledRejection", onUnhandledRejection);
    cleanups.push(() => {
      process.off("unhandledRejection", onUnhandledRejection);
    });
    const sessionStorage = {
      writeSessionOwnershipMarker,
      removeSessionOrphanDirectories,
      removeSessionDirectory(): Promise<boolean> {
        return Promise.reject(Object.assign(new Error("injected busy directory"), { code: "EBUSY" }));
      },
    };

    await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
      sessionStorage,
    });
    await requestUnixJson(socketPath, "POST", "/mcp", {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "vitest", version: "0.0.0" },
      },
    });
    const shutdown = process.listeners("SIGTERM")
      .find((listener) => !signalListenersBefore.has(listener));
    expect(shutdown).toBeDefined();

    shutdown!("SIGTERM");
    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(expect.objectContaining({
        code: "DAEMON_SIGNAL_SHUTDOWN_FAILED",
        error: expect.any(AggregateError),
      }));
      expect(process.exitCode).toBe(1);
    });
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    expect(unhandledRejections).toEqual([]);
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

    const reapedWhileActive = await daemon.reapExpiredSessions();
    expect(reapedWhileActive).toMatchObject({ sessionsRetired: 0 });
    expect(fs.existsSync(sessionDir)).toBe(true);

    await eventStream.close();
  });

  it("keeps a session resident until both concurrent request references settle", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-reaper-refcount-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    vi.useFakeTimers({ toFake: ["Date"] });
    cleanups.push(() => {
      vi.useRealTimers();
    });
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
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

    const sessionId = await initializeDaemonSession(socketPath, 1);
    const observerSessionId = await initializeDaemonSession(socketPath, 100);
    const observerStream = await openUnixEventStream(socketPath, "/mcp", observerSessionId);
    cleanups.push(() => observerStream.close());
    const sessionDir = path.join(rootDir, "sessions", sessionId);

    const eventStream = await openUnixEventStream(socketPath, "/mcp", sessionId);
    cleanups.push(() => eventStream.close());
    const heldRequest = await holdUnixJsonRequestBody(socketPath, "/mcp", sessionId, {
      jsonrpc: "2.0",
      id: 2,
      method: "ping",
      params: {},
    });
    cleanups.push(async () => {
      await heldRequest.release().catch(() => undefined);
    });

    currentTimeMs += sessionInactivityTtlMs + 1;
    const response = await heldRequest.release();
    expect(response.statusCode).toBe(200);

    currentTimeMs += sessionInactivityTtlMs + 1;
    expect(await daemon.reapExpiredSessions()).toMatchObject({ sessionsRetired: 0 });
    expect(fs.existsSync(sessionDir)).toBe(true);

    const terminalActivityAt = new Date("2026-01-01T00:00:03.000Z");
    vi.setSystemTime(terminalActivityAt);
    await eventStream.close();
    let observedTerminalActivity: string | undefined;
    for (let attempt = 0; attempt < 20 && observedTerminalActivity !== terminalActivityAt.toISOString(); attempt++) {
      const sessions = await listDaemonSessionActivity(socketPath, observerSessionId, 101 + attempt);
      observedTerminalActivity = sessions.find((session) => session.sessionId === sessionId)?.lastActivityAt;
      if (observedTerminalActivity !== terminalActivityAt.toISOString()) {
        await new Promise<void>((resolve) => {
          setImmediate(resolve);
        });
      }
    }
    expect(observedTerminalActivity).toBe(terminalActivityAt.toISOString());
    currentTimeMs += sessionInactivityTtlMs + 1;
    expect(await daemon.reapExpiredSessions()).toMatchObject({ sessionsRetired: 1 });
    expect(fs.existsSync(sessionDir)).toBe(false);
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
    const reapedWhileBodyPending = await daemon.reapExpiredSessions();
    const remainedResident = fs.existsSync(sessionDir);
    const response = await heldRequest.release();

    expect(reapedWhileBodyPending).toMatchObject({ sessionsRetired: 0 });
    expect(remainedResident).toBe(true);
    expect(response.statusCode).toBe(200);

    currentTimeMs += sessionInactivityTtlMs + 1;
    expect(await daemon.reapExpiredSessions()).toMatchObject({ sessionsRetired: 1 });
    expect(fs.existsSync(sessionDir)).toBe(false);
  });

  it("refreshes public session activity when a request settles", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-reaper-touch-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    vi.useFakeTimers({ toFake: ["Date"] });
    cleanups.push(() => {
      vi.useRealTimers();
    });
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
    });
    cleanups.push(() => daemon.close());
    const sessionId = await initializeDaemonSession(socketPath, 1);
    const observerSessionId = await initializeDaemonSession(socketPath, 100);

    const admittedAt = new Date("2026-01-01T00:00:01.000Z");
    vi.setSystemTime(admittedAt);
    const heldRequest = await holdUnixJsonRequestBody(socketPath, "/mcp", sessionId, {
      jsonrpc: "2.0",
      id: 2,
      method: "ping",
      params: {},
    });
    const activeSessions = await listDaemonSessionActivity(socketPath, observerSessionId, 101);
    expect(activeSessions.find((session) => session.sessionId === sessionId)?.lastActivityAt)
      .toBe(admittedAt.toISOString());

    const settledAt = new Date("2026-01-01T00:00:02.000Z");
    vi.setSystemTime(settledAt);
    expect((await heldRequest.release()).statusCode).toBe(200);
    const settledSessions = await listDaemonSessionActivity(socketPath, observerSessionId, 102);
    expect(settledSessions.find((session) => session.sessionId === sessionId)?.lastActivityAt)
      .toBe(settledAt.toISOString());
  });

  it("closes an unconnected transport when session clock initialization fails", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-preconnect-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let currentTimeMs = 1_000;
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
      nowMs: () => currentTimeMs,
    });
    cleanups.push(() => daemon.close());
    const protocolClose = vi.spyOn(McpServer.prototype, "close");
    const transportClose = vi.spyOn(StreamableHTTPServerTransport.prototype, "close");
    cleanups.push(() => {
      protocolClose.mockRestore();
      transportClose.mockRestore();
    });

    currentTimeMs = Number.NaN;
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

    expect(initialize.statusCode).toBe(500);
    expect(protocolClose).toHaveBeenCalledTimes(1);
    expect(transportClose).toHaveBeenCalledTimes(1);
    expect(fs.readdirSync(path.join(rootDir, "sessions"))).toEqual([]);
  });

  it("removes session scratch when ownership marker publication fails", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-marker-failure-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const markerFailure = new Error("injected session ownership marker failure");
    const sessionStorage = {
      writeSessionOwnershipMarker(): Promise<void> {
        return Promise.reject(markerFailure);
      },
      removeSessionOrphanDirectories,
      removeSessionDirectory,
    };
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
      sessionStorage,
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

    expect(initialize.statusCode).toBe(500);
    expect((JSON.parse(initialize.text) as { error: { code: number } }).error.code).toBe(-32603);
    expect(daemon.getHealthStatus().activeSessions).toBe(0);
    expect(fs.readdirSync(path.join(rootDir, "sessions"))).toEqual([]);
  });

  it("rolls back partial control-plane publication after protocol connection", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-register-failure-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    type RegisterTransportArgs = Parameters<DaemonControlPlane["registerTransport"]>;
    const originalRegisterTransport = Reflect.get(DaemonControlPlane.prototype, "registerTransport") as (
      this: DaemonControlPlane,
      ...args: RegisterTransportArgs
    ) => void;
    const registerTransport = vi.spyOn(DaemonControlPlane.prototype, "registerTransport")
      .mockImplementationOnce(function(this: DaemonControlPlane, ...args: RegisterTransportArgs) {
        Reflect.apply(originalRegisterTransport, this, args);
        throw new Error("injected failure after control-plane publication");
      });
    const unregisterTransport = vi.spyOn(DaemonControlPlane.prototype, "unregisterTransport");
    const protocolClose = vi.spyOn(McpServer.prototype, "close");
    const transportClose = vi.spyOn(StreamableHTTPServerTransport.prototype, "close");
    cleanups.push(() => {
      registerTransport.mockRestore();
      unregisterTransport.mockRestore();
      protocolClose.mockRestore();
      transportClose.mockRestore();
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

    expect(initialize.statusCode).toBe(500);
    expect((JSON.parse(initialize.text) as { error: { code: number } }).error.code).toBe(-32603);
    expect(daemon.getHealthStatus().activeSessions).toBe(0);
    expect(unregisterTransport).toHaveBeenCalledTimes(1);
    expect(protocolClose).toHaveBeenCalledTimes(1);
    expect(transportClose).toHaveBeenCalledTimes(1);
    expect(fs.readdirSync(path.join(rootDir, "sessions"))).toEqual([]);
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

  it("retains every construction and rollback failure during shutdown", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-rollback-errors-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const connectFailure = new Error("injected connect failure");
    const protocolCloseFailure = new Error("injected protocol rollback failure");
    const transportCloseFailure = new Error("injected transport rollback failure");
    let releaseConnect!: () => void;
    let markConnectEntered!: () => void;
    const connectEntered = new Promise<void>((resolve) => {
      markConnectEntered = resolve;
    });
    const connectGate = new Promise<void>((resolve) => {
      releaseConnect = resolve;
    });
    const connect = vi.spyOn(McpServer.prototype, "connect")
      .mockImplementationOnce(async () => {
        markConnectEntered();
        await connectGate;
        throw connectFailure;
      });
    const protocolClose = vi.spyOn(McpServer.prototype, "close")
      .mockRejectedValueOnce(protocolCloseFailure);
    const transportClose = vi.spyOn(StreamableHTTPServerTransport.prototype, "close")
      .mockRejectedValueOnce(transportCloseFailure);
    cleanups.push(() => {
      connect.mockRestore();
      protocolClose.mockRestore();
      transportClose.mockRestore();
    });

    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
    });
    cleanups.push(() => {
      releaseConnect();
    });
    const initializing = requestUnixJson(socketPath, "POST", "/mcp", {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "vitest", version: "0.0.0" },
      },
    });
    await connectEntered;

    const closing = daemon.close();
    releaseConnect();
    const [, closeError] = await Promise.all([
      initializing,
      closing.then(() => null, (error: unknown) => error),
    ]);
    const errors = flattenErrors(closeError);

    expect(errors).toContain(connectFailure);
    expect(errors).toContain(protocolCloseFailure);
    expect(errors).toContain(transportCloseFailure);
    expect(fs.readdirSync(path.join(rootDir, "sessions"))).toEqual([]);
  });

  it("rolls back a session when server construction fails", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-session-reaper-server-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const createServer = vi.spyOn(graftServerModule, "createGraftServer")
      .mockImplementationOnce(() => {
        throw new Error("injected server construction failure");
      });
    cleanups.push(() => {
      createServer.mockRestore();
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
