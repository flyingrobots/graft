import { afterEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as fsPromises from "node:fs/promises";
import * as http from "node:http";
import * as os from "node:os";
import * as path from "node:path";
import { performance } from "node:perf_hooks";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { RotatingNdjsonLog } from "../../../src/adapters/rotating-ndjson-log.js";
import { DaemonControlPlane } from "../../../src/mcp/daemon-control-plane.js";
import { PersistentMonitorRuntime } from "../../../src/mcp/persistent-monitor-runtime.js";
import * as graftServerModule from "../../../src/mcp/server.js";
import {
  acquireDaemonRootOwnership,
  captureSessionDirectoryIdentity,
  DaemonQuarantineEntryChangedError,
  DaemonRootOwnerClaimTimeoutError,
  type DaemonSessionDirectoryIdentity,
  type DaemonSessionsRootAuthority,
  daemonRootOwnerIsLive,
  daemonSessionDirectoryIdentityMatches,
  daemonSessionsRootIdentityMatches,
  deriveGenericUnixProcessStartIdentity,
  guardedEntryMatches,
  type LegacyUnmarkedSessionPolicy,
  nodeDaemonSessionStorage,
  quarantineDaemonRootOwner,
  publishDaemonRootOwner,
  readProcessStartIdentity,
  removeSessionDirectory,
  removeSessionOrphanDirectories,
  retainDaemonSessionsRoot,
  UnsafeDaemonSessionDirectoryError,
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
  rmObserver,
  unlinkObserver,
  rmdirObserver,
  lstatObserver,
} = vi.hoisted(() => ({
  randomUUIDMock: vi.fn(),
  renameObserver: vi.fn(),
  linkObserver: vi.fn(),
  readdirObserver: vi.fn(),
  readFileObserver: vi.fn(),
  rmObserver: vi.fn(),
  unlinkObserver: vi.fn(),
  rmdirObserver: vi.fn(),
  lstatObserver: vi.fn(),
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
    async rm(target: fs.PathLike, options?: fs.RmOptions): Promise<void> {
      await rmObserver(target, options);
      return actual.rm(target, options);
    },
    async unlink(target: fs.PathLike): Promise<void> {
      await unlinkObserver(target);
      return actual.unlink(target);
    },
    async rmdir(target: fs.PathLike): Promise<void> {
      await rmdirObserver(target);
      return actual.rmdir(target);
    },
    async lstat(target: fs.PathLike, options?: fs.StatOptions): Promise<fs.Stats | fs.BigIntStats> {
      await lstatObserver(target, options);
      return actual.lstat(target, options);
    },
  };
});

const cleanups: (() => Promise<void> | void)[] = [];

async function retainTestSessionsRoot(
  sessionsRoot: string,
): Promise<DaemonSessionsRootAuthority> {
  const authority = await retainDaemonSessionsRoot(sessionsRoot);
  cleanups.push(() => authority.close());
  return authority;
}

/**
 * Makes the ownership-marker lstat inside one session directory fail with
 * EACCES, the error a candidate without search permission produces for a
 * non-root user. Injected at the storage boundary so it applies under any uid.
 */
function injectOwnershipMarkerLstatFailure(sessionDir: string): void {
  const markerPath = path.join(sessionDir, ".graft-session-owner.json");
  lstatObserver.mockImplementation((target: fs.PathLike) => {
    if (String(target) === markerPath) {
      throw Object.assign(new Error(`EACCES: permission denied, lstat '${markerPath}'`), {
        code: "EACCES",
      });
    }
  });
}

afterEach(async () => {
  renameObserver.mockReset();
  linkObserver.mockReset();
  readdirObserver.mockReset();
  readFileObserver.mockReset();
  rmObserver.mockReset();
  unlinkObserver.mockReset();
  rmdirObserver.mockReset();
  lstatObserver.mockReset();
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
      const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), `gsr-interval-${String(index)}-`));
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

  it("rejects an invalid WARP resident limit before touching daemon-root storage", async () => {
    const parentDir = fs.mkdtempSync(path.join(os.tmpdir(), "gsr-warp-limit-"));
    const graftDir = path.join(parentDir, "graft");
    const socketPath = path.join(parentDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(parentDir, { recursive: true, force: true });
    });

    await expect((async () => {
      const daemon = await startDaemonServer({
        graftDir,
        socketPath,
        env: { GRAFT_WARP_MAX_RESIDENTS: "0" },
        sessionReaperIntervalMs: 0,
      });
      await daemon.close();
    })()).rejects.toBeInstanceOf(RangeError);
    expect(fs.existsSync(graftDir)).toBe(false);
    expect(fs.existsSync(socketPath)).toBe(false);
  });

  it("rejects inactivity TTL values outside the positive safe-integer domain", async () => {
    const invalidTtls = [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1.5,
      Number.MAX_SAFE_INTEGER + 1];

    for (const [index, sessionInactivityTtlMs] of invalidTtls.entries()) {
      const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), `gsr-ttl-${String(index)}-`));
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gsr-clock-"));
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gsr-invalid-clock-"));
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

  it("rechecks retained clock failures before each mid-sweep retirement", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-clk-mid-sweep-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let currentTimeMs = 1_000;
    let gatedSessionId: string | null = null;
    let firstRemovalGated = false;
    let markFirstRemovalEntered!: () => void;
    let releaseFirstRemoval!: () => void;
    const firstRemovalEntered = new Promise<void>((resolve) => {
      markFirstRemovalEntered = resolve;
    });
    const firstRemovalGate = new Promise<void>((resolve) => {
      releaseFirstRemoval = resolve;
    });
    cleanups.push(() => {
      releaseFirstRemoval();
    });
    const sessionStorage = {
      ...nodeDaemonSessionStorage,
      captureSessionDirectoryIdentity,
      writeSessionOwnershipMarker,
      removeSessionOrphanDirectories,
      async removeSessionDirectory(
        sessionDir: string,
        expectedIdentity: DaemonSessionDirectoryIdentity,
        sessionsRootAuthority: DaemonSessionsRootAuthority,
      ): Promise<boolean> {
        if (!firstRemovalGated && path.basename(sessionDir) === gatedSessionId) {
          firstRemovalGated = true;
          markFirstRemovalEntered();
          await firstRemovalGate;
        }
        return removeSessionDirectory(sessionDir, expectedIdentity, sessionsRootAuthority);
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
    gatedSessionId = firstSessionId;
    const secondSessionDir = path.join(rootDir, "sessions", secondSessionId);

    currentTimeMs = 11_001;
    const sweeping = daemon.reapExpiredSessions();
    await firstRemovalEntered;
    currentTimeMs = Number.NaN;
    expect((await requestUnixJson(socketPath, "POST", "/mcp", {
      jsonrpc: "2.0",
      id: 3,
      method: "ping",
      params: {},
    }, { "mcp-session-id": secondSessionId })).statusCode).toBe(500);
    currentTimeMs = 11_002;
    releaseFirstRemoval();

    await expect(sweeping).resolves.toMatchObject({
      sessionsRetired: 1,
      liveDirectoriesRemoved: 1,
      sweepFailure: {
        code: "MONOTONIC_CLOCK_INVALID",
        reason: "NON_FINITE",
        received: "NaN",
        previousAcceptedMs: 11_001,
      },
    });
    expect(fs.existsSync(secondSessionDir)).toBe(true);

    currentTimeMs = 21_002;
    await expect(daemon.reapExpiredSessions()).resolves.toMatchObject({
      sessionsRetired: 1,
      sweepFailure: null,
    });
    expect(fs.existsSync(secondSessionDir)).toBe(false);
  });

  it("removes prior-process session directories before accepting requests", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gsr-restart-"));
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

  it.skipIf(process.platform === "win32")("rejects a symlinked sessions root without touching its target", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-root-link-"));
    const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gs-root-target-"));
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

  it.skipIf(process.platform === "win32")("refuses session construction after the established sessions root is replaced", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-create-root-swap-"));
    const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gs-create-target-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    const sessionsRoot = path.join(rootDir, "sessions");
    const parkedSessionsRoot = path.join(rootDir, "sessions-before-swap");
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

    fs.renameSync(sessionsRoot, parkedSessionsRoot);
    fs.symlinkSync(externalRoot, sessionsRoot, "dir");
    cleanups.push(() => {
      const stat = fs.lstatSync(sessionsRoot, { throwIfNoEntry: false });
      if (stat?.isSymbolicLink() === true) fs.unlinkSync(sessionsRoot);
      if (fs.existsSync(parkedSessionsRoot) && !fs.existsSync(sessionsRoot)) {
        fs.renameSync(parkedSessionsRoot, sessionsRoot);
      }
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
    const health = await requestUnixJson(socketPath, "GET", "/healthz");

    expect(initialize.statusCode).toBe(500);
    expect(JSON.parse(health.text)).toMatchObject({ activeSessions: 0 });
    expect(fs.readdirSync(externalRoot)).toEqual([]);
  });

  it.skipIf(process.platform === "win32")("refuses a periodic orphan scan after the sessions root becomes a symlink", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-root-swap-"));
    const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gs-swap-target-"));
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

  it("refuses a real sessions-root replacement between periodic sweeps", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-root-generation-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    const sessionsRoot = path.join(rootDir, "sessions");
    const parkedSessionsRoot = path.join(rootDir, "sessions-before-replacement");
    const replacementSessionId = "00000000-0000-4000-8000-000000000001";
    const replacementSession = path.join(sessionsRoot, replacementSessionId);
    cleanups.push(() => { fs.rmSync(rootDir, { recursive: true, force: true }); });

    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
    });
    cleanups.push(() => daemon.close());
    expect((await daemon.reapExpiredSessions()).cleanupFailures).toEqual([]);

    fs.renameSync(sessionsRoot, parkedSessionsRoot);
    fs.mkdirSync(replacementSession, { recursive: true });
    fs.writeFileSync(path.join(replacementSession, "keep.txt"), "replacement\n");
    await writeSessionOwnershipMarker(
      replacementSession,
      "00000000-0000-4000-8000-000000000099",
      replacementSessionId,
    );
    cleanups.push(() => {
      fs.rmSync(sessionsRoot, { recursive: true, force: true });
      if (fs.existsSync(parkedSessionsRoot)) fs.renameSync(parkedSessionsRoot, sessionsRoot);
    });

    const sweep = await daemon.reapExpiredSessions();

    expect(sweep.orphanDirectoriesRemoved).toBe(0);
    expect(sweep.cleanupFailures).toEqual([
      expect.objectContaining({
        code: "ORPHAN_SCAN_FAILED",
        path: sessionsRoot,
      }),
    ]);
    expect(fs.readFileSync(path.join(replacementSession, "keep.txt"), "utf-8"))
      .toBe("replacement\n");
  });

  it.skipIf(process.platform === "win32")("refuses session removal when the sessions root is not the retained root", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-retained-root-session-"));
    const sessionsRoot = path.join(rootDir, "sessions");
    const retainedRoot = path.join(rootDir, "sessions-retained");
    const sessionId = "00000000-0000-4000-8000-000000000001";
    const sessionDir = path.join(sessionsRoot, sessionId);
    fs.mkdirSync(sessionsRoot);
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const sessionsRootAuthority = await retainTestSessionsRoot(sessionsRoot);

    // The retained root moves away and a look-alike takes its path, with a session
    // whose identity is captured after the swap, so only the retained-root check
    // can tell the two roots apart.
    fs.renameSync(sessionsRoot, retainedRoot);
    fs.mkdirSync(sessionDir, { recursive: true });
    fs.writeFileSync(path.join(sessionDir, "keep.txt"), "look-alike\n");
    const expectedIdentity = await captureSessionDirectoryIdentity(sessionDir);

    await expect(removeSessionDirectory(sessionDir, expectedIdentity, sessionsRootAuthority))
      .rejects
      .toMatchObject({ code: "UNSAFE_DAEMON_SESSIONS_ROOT" });
    expect(fs.readFileSync(path.join(sessionDir, "keep.txt"), "utf-8")).toBe("look-alike\n");
  });

  it.skipIf(process.platform === "win32")("refuses an orphan sweep when the sessions root is not the retained root", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-retained-root-orphan-"));
    const sessionsRoot = path.join(rootDir, "sessions");
    const retainedRoot = path.join(rootDir, "sessions-retained");
    const orphanDir = path.join(sessionsRoot, "00000000-0000-4000-8000-000000000001");
    fs.mkdirSync(sessionsRoot);
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const sessionsRootAuthority = await retainTestSessionsRoot(sessionsRoot);

    // An unmarked directory under "remove" is exactly what a sweep deletes, so the
    // retained-root check is the only thing that can spare it.
    fs.renameSync(sessionsRoot, retainedRoot);
    fs.mkdirSync(orphanDir, { recursive: true });
    fs.writeFileSync(path.join(orphanDir, "keep.txt"), "look-alike\n");

    const outcome = await removeSessionOrphanDirectories(
      sessionsRoot,
      new Set(),
      "remove",
      sessionsRootAuthority,
    ).then((result) => result, (error: unknown) => error);

    expect(outcome).toMatchObject({ code: "UNSAFE_DAEMON_SESSIONS_ROOT" });
    expect(fs.readFileSync(path.join(orphanDir, "keep.txt"), "utf-8")).toBe("look-alike\n");
  });

  it("records session and sessions-root identities without numeric rounding", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-lossless-identity-"));
    const sessionsRoot = path.join(rootDir, "sessions");
    const sessionDir = path.join(sessionsRoot, "00000000-0000-4000-8000-000000000001");
    fs.mkdirSync(sessionDir, { recursive: true });
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const sessionsRootAuthority = await retainTestSessionsRoot(sessionsRoot);
    const expectedSession = fs.lstatSync(sessionDir, { bigint: true });
    const expectedRoot = fs.lstatSync(sessionsRoot, { bigint: true });

    const identity = await captureSessionDirectoryIdentity(sessionDir);

    expect(identity).toEqual({ device: expectedSession.dev, inode: expectedSession.ino });
    expect({ device: sessionsRootAuthority.device, inode: sessionsRootAuthority.inode })
      .toEqual({ device: expectedRoot.dev, inode: expectedRoot.ino });
  });

  it("tells apart identities that differ only above 2^53", () => {
    // Oracle: two inode numbers one apart above 2^53 are different directories,
    // and Number() maps them to the same value, so only a lossless bigint
    // comparison can refuse the second.
    const inode = 2n ** 60n;
    const device = 2n ** 60n + 3n;
    expect(Number(inode)).toBe(Number(inode + 1n));
    const directoryStat = (statDevice: bigint, statInode: bigint): fs.BigIntStats => ({
      dev: statDevice,
      ino: statInode,
      isDirectory: () => true,
      isSymbolicLink: () => false,
    }) as unknown as fs.BigIntStats;
    const expected = { device, inode };
    const cases = [
      ["session directory", (stat: fs.BigIntStats) => daemonSessionDirectoryIdentityMatches(expected, stat)],
      ["sessions root", (stat: fs.BigIntStats) => daemonSessionsRootIdentityMatches(expected, stat)],
      ["quarantine entry", (stat: fs.BigIntStats) => guardedEntryMatches({ ...expected, directory: true }, stat)],
    ] as const;

    const outcomes = cases.map(([name, matches]) => ({
      name,
      same: matches(directoryStat(device, inode)),
      otherInode: matches(directoryStat(device, inode + 1n)),
      otherDevice: matches(directoryStat(device + 1n, inode)),
    }));

    expect(outcomes).toEqual(cases.map(([name]) => ({
      name,
      same: true,
      otherInode: false,
      otherDevice: false,
    })));
  });

  it("isolates an orphan inspection failure to its own candidate", async () => {
    // The fault is injected at the storage boundary rather than produced with
    // file modes, so the test asserts under any uid, including root in the
    // container test stage. getuid reports root to prove no uid gate remains.
    expect.hasAssertions();
    const getuid = vi.spyOn(process, "getuid").mockReturnValue(0);
    cleanups.push(() => {
      getuid.mockRestore();
    });
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "go-inspection-isolation-"));
    const sessionsRoot = path.join(rootDir, "sessions");
    const unreadableId = "00000000-0000-4000-8000-000000000001";
    const removableId = "00000000-0000-4000-8000-000000000002";
    const unreadableDir = path.join(sessionsRoot, unreadableId);
    const removableDir = path.join(sessionsRoot, removableId);
    fs.mkdirSync(unreadableDir, { recursive: true });
    fs.mkdirSync(removableDir, { recursive: true });
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const sessionsRootAuthority = await retainTestSessionsRoot(sessionsRoot);
    injectOwnershipMarkerLstatFailure(unreadableDir);

    const result = await removeSessionOrphanDirectories(
      sessionsRoot,
      new Set(),
      "remove",
      sessionsRootAuthority,
    );

    expect(result.removed).toBe(1);
    expect(fs.existsSync(removableDir)).toBe(false);
    expect(result.failures).toEqual([
      expect.objectContaining({
        sessionId: unreadableId,
        path: unreadableDir,
        error: expect.objectContaining({ code: "EACCES" }),
      }),
    ]);
    expect(fs.existsSync(unreadableDir)).toBe(true);
  });

  it("starts with a prior-process orphan it cannot clean and records it as debt for the next sweep", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "go-startup-debt-"));
    const sessionsRoot = path.join(rootDir, "sessions");
    const socketPath = path.join(rootDir, "daemon.sock");
    const unreadableId = "00000000-0000-4000-8000-000000000001";
    const removableId = "00000000-0000-4000-8000-000000000002";
    const unreadableDir = path.join(sessionsRoot, unreadableId);
    const removableDir = path.join(sessionsRoot, removableId);
    fs.mkdirSync(unreadableDir, { recursive: true, mode: 0o700 });
    fs.mkdirSync(removableDir, { recursive: true, mode: 0o700 });
    fs.chmodSync(sessionsRoot, 0o700);
    await writeSessionOwnershipMarker(unreadableDir, "00000000-0000-4000-8000-000000000799", unreadableId);
    await writeSessionOwnershipMarker(removableDir, "00000000-0000-4000-8000-000000000799", removableId);
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    cleanups.push(() => {
      consoleError.mockRestore();
    });
    injectOwnershipMarkerLstatFailure(unreadableDir);

    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
    });
    cleanups.push(() => daemon.close());

    expect(fs.existsSync(removableDir)).toBe(false);
    expect(fs.existsSync(unreadableDir)).toBe(true);
    const expectedDebt = expect.objectContaining({
      code: "ORPHAN_DIRECTORY_REMOVE_FAILED",
      sessionId: unreadableId,
      path: unreadableDir,
      retryable: true,
    });
    expect(consoleError).toHaveBeenCalledWith({
      code: "DAEMON_STARTUP_SESSION_CLEANUP_DEFERRED",
      cleanupFailures: [expectedDebt],
    });
    const sweep = await daemon.reapExpiredSessions();
    expect(sweep.cleanupFailures).toEqual([expectedDebt]);
    expect((await requestUnixJson(socketPath, "GET", "/healthz")).statusCode).toBe(200);
  });

  it("reports the stable code of each orphan cleanup failure as a structured field", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "go-failure-code-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    const changedId = "00000000-0000-4000-8000-000000000801";
    const deniedId = "00000000-0000-4000-8000-000000000802";
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let scanCalls = 0;
    const sessionStorage = {
      ...nodeDaemonSessionStorage,
      captureSessionDirectoryIdentity,
      writeSessionOwnershipMarker,
      removeSessionDirectory,
      removeSessionOrphanDirectories(sessionsRoot: string) {
        scanCalls++;
        if (scanCalls === 1) return Promise.resolve({ removed: 0, failures: [], preservedEntries: [] });
        const changedPath = path.join(sessionsRoot, changedId);
        const deniedPath = path.join(sessionsRoot, deniedId);
        return Promise.resolve({
          removed: 0,
          failures: [
            {
              sessionId: changedId,
              path: changedPath,
              error: new DaemonQuarantineEntryChangedError(path.join(changedPath, "scratch.txt")),
            },
            {
              sessionId: deniedId,
              path: deniedPath,
              error: Object.assign(new Error("EACCES: permission denied"), { code: "EACCES" }),
            },
          ],
          preservedEntries: [],
        });
      },
    };
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
      sessionStorage,
    });
    cleanups.push(() => daemon.close());

    const sweep = await daemon.reapExpiredSessions();

    expect(sweep.cleanupFailures.map((failure) => ({
      code: failure.code,
      sessionId: failure.sessionId,
      causeCode: failure.causeCode,
    }))).toEqual([
      { code: "ORPHAN_DIRECTORY_REMOVE_FAILED", sessionId: changedId, causeCode: "DAEMON_QUARANTINE_ENTRY_CHANGED" },
      { code: "ORPHAN_DIRECTORY_REMOVE_FAILED", sessionId: deniedId, causeCode: "EACCES" },
    ]);
  });

  it("publishes no canonical session directory until its ownership marker is in place", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-staged-publish-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    const sessionsRoot = path.join(rootDir, "sessions");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const uuidName = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
    // What a crash at each construction step would leave: the canonical UUID
    // entries present when identity capture and the marker write begin.
    const canonicalEntriesAtStep: Record<string, string[]> = {};
    const canonicalEntries = (): string[] => fs.readdirSync(sessionsRoot)
      .filter((name) => uuidName.test(name));
    const sessionStorage = {
      ...nodeDaemonSessionStorage,
      removeSessionDirectory,
      removeSessionOrphanDirectories,
      captureSessionDirectoryIdentity(sessionDir: string) {
        canonicalEntriesAtStep["capture"] = canonicalEntries();
        return captureSessionDirectoryIdentity(sessionDir);
      },
      writeSessionOwnershipMarker(sessionDir: string, daemonInstanceId: string, sessionId: string) {
        canonicalEntriesAtStep["marker"] = canonicalEntries();
        return writeSessionOwnershipMarker(sessionDir, daemonInstanceId, sessionId);
      },
    };
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
      sessionStorage,
    });
    cleanups.push(() => daemon.close());

    const sessionId = await initializeDaemonSession(socketPath, 1);

    expect(canonicalEntriesAtStep).toEqual({ capture: [], marker: [] });
    expect(fs.readdirSync(sessionsRoot)).toEqual([sessionId]);
    expect(JSON.parse(fs.readFileSync(path.join(sessionsRoot, sessionId, ".graft-session-owner.json"), "utf-8")))
      .toMatchObject({ sessionId });
  });

  it("removes a session staging directory abandoned by a crash on the next startup of a custom endpoint", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-staged-abandoned-"));
    const socketPath = path.join(rootDir, "custom-daemon.sock");
    const sessionsRoot = path.join(rootDir, "sessions");
    const unmarkedStaging = path.join(sessionsRoot, ".graft-staging-00000000-0000-4000-8000-000000000901");
    const markedStaging = path.join(sessionsRoot, ".graft-staging-00000000-0000-4000-8000-000000000902");
    fs.mkdirSync(unmarkedStaging, { recursive: true, mode: 0o700 });
    fs.mkdirSync(markedStaging, { recursive: true, mode: 0o700 });
    fs.chmodSync(sessionsRoot, 0o700);
    await writeSessionOwnershipMarker(
      markedStaging,
      "00000000-0000-4000-8000-000000000799",
      "00000000-0000-4000-8000-000000000902",
    );
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

    expect(fs.readdirSync(sessionsRoot)).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("preserves a staging-named directory holding anything besides an ownership marker", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-staged-unexpected-"));
    const sessionsRoot = path.join(rootDir, "sessions");
    const staging = path.join(sessionsRoot, ".graft-staging-00000000-0000-4000-8000-000000000903");
    fs.mkdirSync(staging, { recursive: true, mode: 0o700 });
    fs.chmodSync(sessionsRoot, 0o700);
    fs.writeFileSync(path.join(staging, "keep.txt"), "not construction residue\n");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const sessionsRootAuthority = await retainTestSessionsRoot(sessionsRoot);

    const result = await removeSessionOrphanDirectories(
      sessionsRoot,
      new Set(),
      "preserve",
      sessionsRootAuthority,
    );

    expect(result).toEqual({
      removed: 0,
      failures: [],
      preservedEntries: [{
        entryName: path.basename(staging),
        path: staging,
        reason: "STAGING_UNEXPECTED_CONTENT",
      }],
    });
    expect(fs.readFileSync(path.join(staging, "keep.txt"), "utf-8")).toBe("not construction residue\n");
  });

  it.skipIf(process.platform === "win32")("refuses live-session cleanup after the sessions root becomes a symlink", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gls-root-swap-"));
    const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gls-swap-target-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    const sessionsRoot = path.join(rootDir, "sessions");
    const parkedSessionsRoot = path.join(rootDir, "sessions-before-swap");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
      fs.rmSync(externalRoot, { recursive: true, force: true });
    });
    let markRemovalFinished!: () => void;
    const removalFinished = new Promise<void>((resolve) => {
      markRemovalFinished = resolve;
    });
    let swapped = false;
    const sessionStorage = {
      ...nodeDaemonSessionStorage,
      captureSessionDirectoryIdentity,
      writeSessionOwnershipMarker,
      removeSessionOrphanDirectories,
      async removeSessionDirectory(
        sessionDir: string,
        expectedIdentity: DaemonSessionDirectoryIdentity,
        sessionsRootAuthority: DaemonSessionsRootAuthority,
      ): Promise<boolean> {
        if (!swapped) {
          fs.renameSync(sessionsRoot, parkedSessionsRoot);
          fs.symlinkSync(externalRoot, sessionsRoot, "dir");
          swapped = true;
        }
        try {
          return await removeSessionDirectory(sessionDir, expectedIdentity, sessionsRootAuthority);
        } finally {
          markRemovalFinished();
        }
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
      const stat = fs.lstatSync(sessionsRoot, { throwIfNoEntry: false });
      if (stat?.isSymbolicLink() === true) fs.unlinkSync(sessionsRoot);
      if (fs.existsSync(parkedSessionsRoot) && !fs.existsSync(sessionsRoot)) {
        fs.renameSync(parkedSessionsRoot, sessionsRoot);
      }
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
    const externalSession = path.join(externalRoot, sessionId!);
    fs.mkdirSync(externalSession, { recursive: true });
    fs.writeFileSync(path.join(externalSession, "keep.txt"), "external\n");

    await requestUnixJson(socketPath, "DELETE", "/mcp", undefined, {
      "mcp-session-id": sessionId!,
    });
    await removalFinished;

    expect(fs.readFileSync(path.join(externalSession, "keep.txt"), "utf-8")).toBe("external\n");
    expect(fs.existsSync(path.join(parkedSessionsRoot, sessionId!))).toBe(true);
  });

  it.skipIf(process.platform === "win32")("preserves a directory replacement made after live-session validation", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gls-child-swap-"));
    const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gls-child-target-"));
    const sessionsRoot = path.join(rootDir, "sessions");
    const sessionId = "00000000-0000-4000-8000-000000000001";
    const sessionDir = path.join(sessionsRoot, sessionId);
    const displacedSession = path.join(rootDir, "validated-session");
    fs.mkdirSync(sessionDir, { recursive: true });
    fs.writeFileSync(path.join(sessionDir, "original.txt"), "original\n");
    fs.writeFileSync(path.join(externalRoot, "keep.txt"), "external\n");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
      fs.rmSync(externalRoot, { recursive: true, force: true });
    });
    let swapped = false;
    renameObserver.mockImplementation((oldPath, newPath, error) => {
      if (error !== null || swapped || path.resolve(String(oldPath)) !== sessionDir) return;
      swapped = true;
      fs.renameSync(String(newPath), displacedSession);
      fs.renameSync(externalRoot, String(newPath));
    });

    const expectedIdentity = await captureSessionDirectoryIdentity(sessionDir);

    const sessionsRootAuthority = await retainTestSessionsRoot(sessionsRoot);

    await expect(removeSessionDirectory(sessionDir, expectedIdentity, sessionsRootAuthority))
      .rejects
      .toBeInstanceOf(UnsafeDaemonSessionDirectoryError);

    expect(swapped).toBe(true);
    expect(fs.readFileSync(path.join(sessionDir, "keep.txt"), "utf-8")).toBe("external\n");
    expect(fs.readFileSync(path.join(displacedSession, "original.txt"), "utf-8"))
      .toBe("original\n");
  });

  it.skipIf(process.platform === "win32")("restores a quarantined live session inside a root renamed after quarantine", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "glr-post-quarantine-"));
    const sessionsRoot = path.join(rootDir, "sessions");
    const parkedSessionsRoot = path.join(rootDir, "sessions-parked");
    const sessionId = "00000000-0000-4000-8000-000000000001";
    const sessionDir = path.join(sessionsRoot, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });
    fs.writeFileSync(path.join(sessionDir, "original.txt"), "original\n");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let swapped = false;
    renameObserver.mockImplementation((oldPath, _newPath, error) => {
      if (error !== null || swapped || path.resolve(String(oldPath)) !== sessionDir) return;
      swapped = true;
      fs.renameSync(sessionsRoot, parkedSessionsRoot);
      fs.mkdirSync(sessionsRoot);
    });
    const expectedIdentity = await captureSessionDirectoryIdentity(sessionDir);

    const sessionsRootAuthority = await retainTestSessionsRoot(sessionsRoot);

    await expect(removeSessionDirectory(sessionDir, expectedIdentity, sessionsRootAuthority))
      .rejects
      .toMatchObject({ code: "UNSAFE_DAEMON_SESSIONS_ROOT" });

    expect(swapped).toBe(true);
    expect(fs.readdirSync(parkedSessionsRoot)).toEqual([sessionId]);
    expect(fs.readFileSync(path.join(parkedSessionsRoot, sessionId, "original.txt"), "utf-8"))
      .toBe("original\n");
    expect(fs.readdirSync(sessionsRoot)).toEqual([]);
  });

  it("preserves an orphan replacement made after eligibility inspection", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "go-child-swap-"));
    const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "go-child-target-"));
    const sessionsRoot = path.join(rootDir, "sessions");
    const sessionId = "00000000-0000-4000-8000-000000000001";
    const sessionDir = path.join(sessionsRoot, sessionId);
    const displacedSession = path.join(rootDir, "inspected-orphan");
    const markerPath = path.join(sessionDir, ".graft-session-owner.json");
    fs.mkdirSync(sessionDir, { recursive: true });
    fs.writeFileSync(path.join(sessionDir, "original.txt"), "original\n");
    await writeSessionOwnershipMarker(
      sessionDir,
      "00000000-0000-4000-8000-000000000099",
      sessionId,
    );
    fs.writeFileSync(path.join(externalRoot, "keep.txt"), "external\n");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
      fs.rmSync(externalRoot, { recursive: true, force: true });
    });
    let swapped = false;
    readFileObserver.mockImplementationOnce((filePath) => {
      if (path.resolve(String(filePath)) !== markerPath) return;
      fs.renameSync(sessionDir, displacedSession);
      fs.renameSync(externalRoot, sessionDir);
      swapped = true;
    });

    const sessionsRootAuthority = await retainTestSessionsRoot(sessionsRoot);

    const result = await removeSessionOrphanDirectories(
      sessionsRoot,
      new Set(),
      "preserve",
      sessionsRootAuthority,
    );

    expect(swapped).toBe(true);
    expect(result).toMatchObject({
      removed: 0,
      failures: [{ sessionId, path: sessionDir }],
    });
    expect(result.failures[0]?.error).toBeInstanceOf(UnsafeDaemonSessionDirectoryError);
    expect(fs.readFileSync(path.join(sessionDir, "keep.txt"), "utf-8")).toBe("external\n");
    expect(fs.readFileSync(path.join(displacedSession, "original.txt"), "utf-8"))
      .toBe("original\n");
  });

  const quarantineCallSites = [
    { callSite: "live-session removal" },
    { callSite: "orphan removal" },
  ] as const;

  async function removeThroughCallSite(
    callSite: (typeof quarantineCallSites)[number]["callSite"],
    sessionsRoot: string,
    sessionDir: string,
  ): Promise<{ readonly removed: boolean; readonly error: unknown }> {
    const sessionsRootAuthority = await retainTestSessionsRoot(sessionsRoot);
    if (callSite === "live-session removal") {
      const identity = await captureSessionDirectoryIdentity(sessionDir);
      return removeSessionDirectory(sessionDir, identity, sessionsRootAuthority)
        .then((removed) => ({ removed, error: null }), (error: unknown) => ({ removed: false, error }));
    }
    const result = await removeSessionOrphanDirectories(
      sessionsRoot,
      new Set(),
      "preserve",
      sessionsRootAuthority,
    );
    return { removed: result.removed === 1, error: result.failures[0]?.error ?? null };
  }

  function findQuarantine(sessionsRoot: string): string | null {
    const name = fs.readdirSync(sessionsRoot).find((entry) => entry.startsWith(".graft-removing-"));
    return name === undefined ? null : path.join(sessionsRoot, name);
  }

  it.skipIf(process.platform === "win32").each(quarantineCallSites)(
    "refuses a quarantine entry replaced after deletion begins during $callSite",
    async ({ callSite }) => {
      const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gq-swap-"));
      const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gq-target-"));
      const sessionsRoot = path.join(rootDir, "sessions");
      const sessionId = "00000000-0000-4000-8000-000000000001";
      const sessionDir = path.join(sessionsRoot, sessionId);
      const displacedLate = path.join(rootDir, "displaced-z-late");
      fs.mkdirSync(path.join(sessionDir, "z-late", "nested"), { recursive: true });
      fs.writeFileSync(path.join(sessionDir, "a-early.txt"), "early\n");
      fs.writeFileSync(path.join(sessionDir, "z-late", "nested", "original.txt"), "original\n");
      await writeSessionOwnershipMarker(sessionDir, "00000000-0000-4000-8000-000000000099", sessionId);
      fs.writeFileSync(path.join(externalRoot, "keep.txt"), "external\n");
      cleanups.push(() => {
        fs.rmSync(rootDir, { recursive: true, force: true });
        fs.rmSync(externalRoot, { recursive: true, force: true });
      });
      // The first deletion call inside the quarantine is the latest point both
      // implementations expose after every identity check: `fs.rm` on the
      // quarantine root for a single recursive removal, or the first entry
      // unlink for a guarded walk. A same-user process swaps a not-yet-removed
      // subtree for unrelated content there.
      let replacement: string | null = null;
      const swapInsideQuarantine = (target: fs.PathLike): void => {
        if (replacement !== null) return;
        const quarantine = findQuarantine(sessionsRoot);
        if (quarantine === null) return;
        const resolved = path.resolve(String(target));
        if (resolved !== quarantine && !resolved.startsWith(`${quarantine}${path.sep}`)) return;
        replacement = path.join(quarantine, "z-late");
        fs.renameSync(replacement, displacedLate);
        fs.renameSync(externalRoot, replacement);
      };
      rmObserver.mockImplementation(swapInsideQuarantine);
      unlinkObserver.mockImplementation(swapInsideQuarantine);

      const outcome = await removeThroughCallSite(callSite, sessionsRoot, sessionDir);

      expect(replacement).not.toBeNull();
      expect(fs.existsSync(path.join(replacement!, "keep.txt"))).toBe(true);
      expect(fs.readFileSync(path.join(replacement!, "keep.txt"), "utf-8")).toBe("external\n");
      expect(outcome.removed).toBe(false);
      expect(outcome.error).toMatchObject({ code: "DAEMON_QUARANTINE_ENTRY_CHANGED" });
      expect(fs.existsSync(path.join(path.dirname(replacement!), ".graft-session-owner.json"))).toBe(true);
      expect(fs.readFileSync(path.join(displacedLate, "nested", "original.txt"), "utf-8"))
        .toBe("original\n");
    },
  );

  it.skipIf(process.platform === "win32").each(quarantineCallSites)(
    "removes a nested quarantined tree and unlinks its symlinks without touching their targets during $callSite",
    async ({ callSite }) => {
      const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gq-nested-"));
      const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gq-link-target-"));
      const sessionsRoot = path.join(rootDir, "sessions");
      const sessionId = "00000000-0000-4000-8000-000000000001";
      const sessionDir = path.join(sessionsRoot, sessionId);
      fs.mkdirSync(path.join(sessionDir, "a", "b", "c"), { recursive: true });
      fs.writeFileSync(path.join(sessionDir, "top.txt"), "top\n");
      fs.writeFileSync(path.join(sessionDir, "a", "b", "c", "deep.txt"), "deep\n");
      fs.mkdirSync(path.join(externalRoot, "child"));
      fs.writeFileSync(path.join(externalRoot, "keep.txt"), "external\n");
      fs.writeFileSync(path.join(externalRoot, "child", "inner.txt"), "inner\n");
      fs.symlinkSync(externalRoot, path.join(sessionDir, "link-dir"), "dir");
      fs.symlinkSync(path.join(externalRoot, "keep.txt"), path.join(sessionDir, "a", "link-file"));
      await writeSessionOwnershipMarker(sessionDir, "00000000-0000-4000-8000-000000000099", sessionId);
      cleanups.push(() => {
        fs.rmSync(rootDir, { recursive: true, force: true });
        fs.rmSync(externalRoot, { recursive: true, force: true });
      });

      const outcome = await removeThroughCallSite(callSite, sessionsRoot, sessionDir);

      expect(outcome).toEqual({ removed: true, error: null });
      expect(fs.readdirSync(sessionsRoot)).toEqual([]);
      expect(fs.readFileSync(path.join(externalRoot, "keep.txt"), "utf-8")).toBe("external\n");
      expect(fs.readFileSync(path.join(externalRoot, "child", "inner.txt"), "utf-8")).toBe("inner\n");
    },
  );

  const strandedSessionId = "00000000-0000-4000-8000-000000000701";
  const strandedQuarantineName = `.graft-removing-${strandedSessionId}-00000000-0000-4000-8000-000000000702`;

  function plantStrandedQuarantine(
    sessionsRoot: string,
    name: string,
    marker: { readonly sessionId: string } | null,
  ): string {
    const quarantine = path.join(sessionsRoot, name);
    fs.mkdirSync(path.join(quarantine, "partly", "removed"), { recursive: true });
    fs.writeFileSync(path.join(quarantine, "partly", "removed", "scratch.txt"), "scratch\n");
    if (marker !== null) {
      fs.writeFileSync(path.join(quarantine, ".graft-session-owner.json"), `${JSON.stringify({
        schemaVersion: 1,
        daemonInstanceId: "00000000-0000-4000-8000-000000000799",
        sessionId: marker.sessionId,
      })}\n`);
    }
    return quarantine;
  }

  it("completes a quarantine stranded by a crash on the next daemon startup", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gq-stranded-"));
    const sessionsRoot = path.join(rootDir, "sessions");
    const socketPath = path.join(rootDir, "daemon.sock");
    fs.mkdirSync(sessionsRoot, { recursive: true, mode: 0o700 });
    const quarantine = plantStrandedQuarantine(sessionsRoot, strandedQuarantineName, {
      sessionId: strandedSessionId,
    });
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

    expect(fs.existsSync(quarantine)).toBe(false);
    expect(fs.readdirSync(sessionsRoot)).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("preserves quarantine look-alikes without the exact name or a valid ownership marker", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gq-lookalike-"));
    const sessionsRoot = path.join(rootDir, "sessions");
    fs.mkdirSync(sessionsRoot, { recursive: true });
    const unmarked = plantStrandedQuarantine(sessionsRoot, strandedQuarantineName, null);
    const otherSessionName = ".graft-removing-00000000-0000-4000-8000-000000000711-00000000-0000-4000-8000-000000000712";
    const otherSession = plantStrandedQuarantine(sessionsRoot, otherSessionName, {
      sessionId: strandedSessionId,
    });
    const inexactName = `.graft-removing-${strandedSessionId}-not-a-generated-uuid`;
    const inexact = plantStrandedQuarantine(sessionsRoot, inexactName, { sessionId: strandedSessionId });
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const sessionsRootAuthority = await retainTestSessionsRoot(sessionsRoot);

    const result = await removeSessionOrphanDirectories(
      sessionsRoot,
      new Set(),
      "remove",
      sessionsRootAuthority,
    );

    expect(result.removed).toBe(0);
    expect(result.failures).toEqual([]);
    expect([...result.preservedEntries].sort((left, right) => left.entryName.localeCompare(right.entryName)))
      .toEqual([
        { entryName: otherSessionName, path: otherSession, reason: "QUARANTINE_MALFORMED_OWNERSHIP_MARKER" },
        { entryName: strandedQuarantineName, path: unmarked, reason: "QUARANTINE_UNMARKED" },
        { entryName: inexactName, path: inexact, reason: "UNKNOWN_ENTRY_NAME" },
      ].sort((left, right) => left.entryName.localeCompare(right.entryName)));
    for (const quarantine of [unmarked, otherSession, inexact]) {
      expect(fs.readFileSync(path.join(quarantine, "partly", "removed", "scratch.txt"), "utf-8"))
        .toBe("scratch\n");
    }
  });

  it.skipIf(process.platform === "win32")("preserves a link named like a quarantine without touching its target", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gq-link-"));
    const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gq-link-ext-"));
    const sessionsRoot = path.join(rootDir, "sessions");
    fs.mkdirSync(sessionsRoot, { recursive: true });
    plantStrandedQuarantine(externalRoot, "target", { sessionId: strandedSessionId });
    const target = path.join(externalRoot, "target");
    const link = path.join(sessionsRoot, strandedQuarantineName);
    fs.symlinkSync(target, link, "dir");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
      fs.rmSync(externalRoot, { recursive: true, force: true });
    });
    const sessionsRootAuthority = await retainTestSessionsRoot(sessionsRoot);

    const result = await removeSessionOrphanDirectories(
      sessionsRoot,
      new Set(),
      "remove",
      sessionsRootAuthority,
    );

    expect(result).toEqual({
      removed: 0,
      failures: [],
      preservedEntries: [{ entryName: strandedQuarantineName, path: link, reason: "QUARANTINE_SYMBOLIC_LINK" }],
    });
    expect(fs.lstatSync(link).isSymbolicLink()).toBe(true);
    expect(fs.readFileSync(path.join(target, "partly", "removed", "scratch.txt"), "utf-8")).toBe("scratch\n");
    expect(fs.existsSync(path.join(target, ".graft-session-owner.json"))).toBe(true);
  });

  it("leaves a quarantine alone while its session is still protected", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gq-protected-"));
    const sessionsRoot = path.join(rootDir, "sessions");
    fs.mkdirSync(sessionsRoot, { recursive: true });
    const quarantine = plantStrandedQuarantine(sessionsRoot, strandedQuarantineName, {
      sessionId: strandedSessionId,
    });
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const sessionsRootAuthority = await retainTestSessionsRoot(sessionsRoot);

    const protectedResult = await removeSessionOrphanDirectories(
      sessionsRoot,
      new Set([strandedSessionId]),
      "remove",
      sessionsRootAuthority,
    );
    expect(protectedResult).toEqual({ removed: 0, failures: [], preservedEntries: [] });
    expect(fs.existsSync(path.join(quarantine, "partly", "removed", "scratch.txt"))).toBe(true);

    const releasedResult = await removeSessionOrphanDirectories(
      sessionsRoot,
      new Set(),
      "remove",
      sessionsRootAuthority,
    );
    expect(releasedResult).toEqual({ removed: 1, failures: [], preservedEntries: [] });
    expect(fs.existsSync(quarantine)).toBe(false);
  });

  it.skipIf(process.platform === "win32").each([
    { phase: "enumeration", observer: "readdir" },
    { phase: "removal", observer: "readFile" },
  ] as const)("refuses an orphan scan when the sessions root changes during $phase", async ({ observer }) => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-root-mid-scan-"));
    const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gs-root-mid-scan-target-"));
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

    const sessionsRootAuthority = await retainTestSessionsRoot(sessionsRoot);

    const scanError = await removeSessionOrphanDirectories(
      sessionsRoot,
      new Set(),
      "preserve",
      sessionsRootAuthority,
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-pending-orphan-"));
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-scan-before-open-"));
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
      ...nodeDaemonSessionStorage,
      captureSessionDirectoryIdentity,
      writeSessionOwnershipMarker,
      removeSessionDirectory,
      async removeSessionOrphanDirectories(
        sessionsRoot: string,
        liveSessionIds: ReadonlySet<string>,
        legacyUnmarkedPolicy: LegacyUnmarkedSessionPolicy,
        sessionsRootAuthority: DaemonSessionsRootAuthority,
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
          sessionsRootAuthority,
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-pending-shutdown-"));
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-sweep-single-flight-"));
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
      ...nodeDaemonSessionStorage,
      captureSessionDirectoryIdentity,
      writeSessionOwnershipMarker,
      removeSessionDirectory,
      async removeSessionOrphanDirectories(
        sessionsRoot: string,
        liveSessionIds: ReadonlySet<string>,
        legacyUnmarkedPolicy: LegacyUnmarkedSessionPolicy,
        sessionsRootAuthority: DaemonSessionsRootAuthority,
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
          sessionsRootAuthority,
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-scheduled-sweep-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    cleanups.push(() => {
      vi.useRealTimers();
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
      ...nodeDaemonSessionStorage,
      captureSessionDirectoryIdentity,
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

    expect(scanCalls).toBe(2);
  });

  it("logs unchanged scheduled preservation diagnostics once and again only when they change", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-preserved-dedupe-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    cleanups.push(() => {
      vi.useRealTimers();
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    cleanups.push(() => {
      consoleError.mockRestore();
    });
    let scanCalls = 0;
    let reason: "UNKNOWN_ENTRY_NAME" | "NOT_DIRECTORY" = "UNKNOWN_ENTRY_NAME";
    const sessionStorage = {
      ...nodeDaemonSessionStorage,
      captureSessionDirectoryIdentity,
      writeSessionOwnershipMarker,
      removeSessionDirectory,
      removeSessionOrphanDirectories(sessionsRoot: string) {
        scanCalls++;
        if (scanCalls === 1) return Promise.resolve({ removed: 0, failures: [], preservedEntries: [] });
        return Promise.resolve({
          removed: 0,
          failures: [],
          preservedEntries: [{
            entryName: "operator-owned",
            path: path.join(sessionsRoot, "operator-owned"),
            reason,
          }],
        });
      },
    };
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 1,
      sessionStorage,
    });
    cleanups.push(() => daemon.close());
    const preservedLogCount = (): number => consoleError.mock.calls.filter(
      (call) => String(call[0]).startsWith("[graft] session reaper preserved entries:"),
    ).length;
    const runScheduledSweep = async (): Promise<void> => {
      const expectedCalls = scanCalls + 1;
      await vi.advanceTimersByTimeAsync(1);
      for (let turn = 0; turn < 100 && scanCalls < expectedCalls; turn++) {
        await new Promise<void>((resolve) => {
          setImmediate(resolve);
        });
      }
      expect(scanCalls).toBe(expectedCalls);
      await new Promise<void>((resolve) => {
        setImmediate(resolve);
      });
    };

    await runScheduledSweep();
    await runScheduledSweep();
    await runScheduledSweep();
    expect(preservedLogCount()).toBe(1);

    reason = "NOT_DIRECTORY";
    await runScheduledSweep();
    await runScheduledSweep();
    expect(preservedLogCount()).toBe(2);
    expect((await daemon.reapExpiredSessions()).preservedEntries).toEqual([
      expect.objectContaining({ entryName: "operator-owned", reason: "NOT_DIRECTORY" }),
    ]);
  });

  it("rejects session sweeps after daemon root ownership is released", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-post-close-sweep-"));
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

  it("distinguishes generic-Unix process witnesses within one start second", async () => {
    const startedAt = "Sun Aug 30 20:59:16 2026";
    const firstWitness = `graft-daemon:${"a".repeat(32)}`;
    const secondWitness = `graft-daemon:${"b".repeat(32)}`;
    const firstIdentity = deriveGenericUnixProcessStartIdentity(
      "darwin",
      `${startedAt} ${firstWitness}`,
    );
    const secondIdentity = deriveGenericUnixProcessStartIdentity(
      "darwin",
      `${startedAt} ${secondWitness}`,
    );

    expect(firstIdentity).toMatch(/^darwin:sha256:[0-9a-f]{64}$/u);
    expect(firstIdentity).not.toContain(firstWitness);
    expect(firstIdentity).not.toBe(secondIdentity);
    expect(deriveGenericUnixProcessStartIdentity(
      "darwin",
      `  ${startedAt}   ${firstWitness}  `,
    )).toBe(firstIdentity);

    if (process.platform === "linux" || process.platform === "win32") return;
    const originalTitle = process.title;

    try {
      process.title = "node graft daemon";
      const installedIdentity = await readProcessStartIdentity(process.pid);
      const installedWitness = process.title;
      const repeatedIdentity = await readProcessStartIdentity(process.pid);
      expect(installedWitness).toMatch(/^graft-daemon:[0-9a-f]{32}$/u);
      expect(installedIdentity).toMatch(/^darwin:sha256:[0-9a-f]{64}$/u);
      expect(installedIdentity).not.toContain(installedWitness);
      expect(repeatedIdentity).toBe(installedIdentity);
    } finally {
      process.title = originalTitle;
    }
  });

  it("checks live root ownership before touching the candidate socket path", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-owner-order-"));
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

  it("checks live root ownership before creating the sessions root", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-owner-sessions-order-"));
    const socketPath = path.join(rootDir, "candidate.sock");
    const processStartIdentity = await readProcessStartIdentity(process.pid);
    expect(processStartIdentity).not.toBeNull();
    fs.writeFileSync(path.join(rootDir, "daemon-owner.json"), `${JSON.stringify({
      schemaVersion: 2,
      instanceId: "00000000-0000-4000-8000-000000000098",
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
    expect(fs.existsSync(path.join(rootDir, "sessions"))).toBe(false);
  });

  it.skipIf(process.platform === "win32")("binds the default endpoint with admission closed before legacy orphan cleanup", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-default-bind-first-"));
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
      ...nodeDaemonSessionStorage,
      captureSessionDirectoryIdentity,
      writeSessionOwnershipMarker,
      removeSessionDirectory,
      async removeSessionOrphanDirectories(
        sessionsRoot: string,
        liveSessionIds: ReadonlySet<string>,
        legacyUnmarkedPolicy: LegacyUnmarkedSessionPolicy,
        sessionsRootAuthority: DaemonSessionsRootAuthority,
      ) {
        markScanEntered();
        await scanGate;
        return removeSessionOrphanDirectories(
          sessionsRoot,
          liveSessionIds,
          legacyUnmarkedPolicy,
          sessionsRootAuthority,
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

  it.skipIf(process.platform === "win32")("refuses custom-endpoint startup while a legacy daemon endpoint is live", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-legacy-live-"));
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

  it.skipIf(process.platform === "win32")("preserves unmarked legacy sessions during custom-endpoint sweeps", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-legacy-late-live-"));
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

  it("rolls back a published owner when temporary claim release fails", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-owner-claim-release-"));
    const ownerPath = path.join(rootDir, "daemon-owner.json");
    const socketPath = path.join(rootDir, "daemon.sock");
    const processStartIdentity = `test-process:${String(process.pid)}`;
    const liveness = {
      socketHasActiveListener(): Promise<boolean> {
        return Promise.resolve(false);
      },
      readProcessStartIdentity(pid: number): Promise<string | null> {
        return Promise.resolve(pid === process.pid ? processStartIdentity : null);
      },
    };
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const releaseFailure = Object.assign(new Error("injected claim release failure"), {
      code: "EIO",
    });
    let failureInjected = false;
    renameObserver.mockImplementation((oldPath, newPath, renameError) => {
      if (
        !failureInjected
        && renameError === null
        && oldPath.toString() === `${ownerPath}.claim`
        && newPath.toString().startsWith(`${ownerPath}.claim.released-`)
      ) {
        failureInjected = true;
        throw releaseFailure;
      }
    });

    const firstError = await acquireDaemonRootOwnership({
      graftDir: rootDir,
      socketPath,
    }, liveness).then(async (ownership) => {
      await ownership.release();
      return null;
    }, (error: unknown) => error);
    const ownerSurvivedFailure = fs.existsSync(ownerPath);
    const claimArtifactsAfterFailure = fs.readdirSync(rootDir)
      .filter((entry) => entry.startsWith("daemon-owner.json.claim"));
    const retry = await acquireDaemonRootOwnership({
      graftDir: rootDir,
      socketPath,
    }, liveness).then(
      (ownership) => ({ ownership, error: null }),
      (error: unknown) => ({ ownership: null, error }),
    );
    await retry.ownership?.release();

    expect(firstError).toMatchObject({ code: "EIO" });
    expect(ownerSurvivedFailure).toBe(false);
    expect(claimArtifactsAfterFailure).toEqual([]);
    expect(retry.error).toBeNull();
    expect(retry.ownership).not.toBeNull();
    expect(fs.readdirSync(rootDir)).toEqual([]);
  });

  it("restores a newer owner displaced by a delayed stale takeover", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-owner-race-"));
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-owner-three-way-race-"));
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-owner-stale-claim-"));
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

  function plantRootOwnerClaim(directoryPath: string, claimId: string, pid: number): void {
    fs.mkdirSync(directoryPath, { recursive: true });
    fs.writeFileSync(path.join(directoryPath, "claim.json"), `${JSON.stringify({
      schemaVersion: 1,
      claimId,
      pid,
      processStartIdentity: `dead-process:${claimId}`,
    })}\n`);
  }

  function claimResidue(rootDir: string): { stale: string[]; released: string[] } {
    const names = fs.readdirSync(rootDir).sort();
    return {
      stale: names.filter((name) => name.startsWith("daemon-owner.json.claim.stale-")),
      released: names.filter((name) => name.startsWith("daemon-owner.json.claim.released-")),
    };
  }

  const deadPid = 2_147_483_647;
  const liveOnlyLiveness = {
    socketHasActiveListener(): Promise<boolean> {
      return Promise.resolve(false);
    },
    readProcessStartIdentity(pid: number): Promise<string | null> {
      return Promise.resolve(pid === process.pid ? "live-process:200" : null);
    },
  };

  it("does not accumulate root-claim tombstones across repeated crash-and-recover cycles", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-claim-cycles-"));
    const claimPath = path.join(rootDir, "daemon-owner.json.claim");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let wallClockMs = Date.parse("2026-09-28T00:00:00.000Z");
    const dateNow = vi.spyOn(Date, "now").mockImplementation(() => wallClockMs);
    cleanups.push(() => {
      dateNow.mockRestore();
    });
    const cycles = 5;
    const observed: { stale: number; released: number }[] = [];
    for (let cycle = 0; cycle < cycles; cycle++) {
      // A holder that crashed while holding the claim, and one that crashed
      // between renaming its released claim aside and removing it.
      const crashedClaimId = `00000000-0000-4000-8000-00000000010${String(cycle)}`;
      plantRootOwnerClaim(claimPath, crashedClaimId, deadPid);
      const releasedClaimId = `00000000-0000-4000-8000-00000000020${String(cycle)}`;
      plantRootOwnerClaim(
        `${claimPath}.released-${releasedClaimId}-00000000-0000-4000-8000-00000000030${String(cycle)}`,
        releasedClaimId,
        deadPid,
      );

      const ownership = await acquireDaemonRootOwnership({
        graftDir: rootDir,
        socketPath: path.join(rootDir, "daemon.sock"),
      }, liveOnlyLiveness);
      await ownership.release();

      const residue = claimResidue(rootDir);
      observed.push({ stale: residue.stale.length, released: residue.released.length });
      wallClockMs += 10 * 60_000;
    }

    // Each recovery leaves exactly its own fresh tombstone; every older one and
    // every dead released claim is collected.
    expect(observed).toEqual(Array.from({ length: cycles }, () => ({ stale: 1, released: 0 })));
  });

  it("keeps a fresh tombstone when the recovery stops between the takeover rename and anything after it", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-claim-stamp-"));
    const claimPath = path.join(rootDir, "daemon-owner.json.claim");
    const deadClaimId = "00000000-0000-4000-8000-000000000701";
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const wallClockMs = Date.parse("2026-09-28T00:00:00.000Z");
    const dateNow = vi.spyOn(Date, "now").mockImplementation(() => wallClockMs);
    cleanups.push(() => {
      dateNow.mockRestore();
    });
    // The dead claim was last written long before this recovery.
    plantRootOwnerClaim(claimPath, deadClaimId, deadPid);
    const oldSeconds = (wallClockMs - 60 * 60_000) / 1_000;
    fs.utimesSync(claimPath, oldSeconds, oldSeconds);
    const stalePath = `${claimPath}.stale-${deadClaimId}`;
    // The takeover rename lands, but the recovery does not get past it: this is
    // the observable state a crash immediately after the rename leaves.
    let interrupted = false;
    renameObserver.mockImplementation((oldPath, newPath, error) => {
      if (interrupted || error !== null || String(oldPath) !== claimPath || String(newPath) !== stalePath) return;
      interrupted = true;
      throw new Error("injected interruption after the takeover rename");
    });

    const ownership = await acquireDaemonRootOwnership({
      graftDir: rootDir,
      socketPath: path.join(rootDir, "daemon.sock"),
    }, liveOnlyLiveness);
    await ownership.release();

    expect(interrupted).toBe(true);
    // The tombstone is the ABA fence for this recovery, so the grace period is
    // measured from the recovery, not from the dead claim's last write.
    expect(claimResidue(rootDir).stale).toEqual([path.basename(stalePath)]);
    expect(fs.lstatSync(stalePath).mtimeMs).toBe(wallClockMs);
  });

  it.skipIf(process.platform === "win32")("collects claim residue only from exact tombstone names, never through a link", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-claim-gc-safety-"));
    const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gs-claim-gc-target-"));
    const claimPath = path.join(rootDir, "daemon-owner.json.claim");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
      fs.rmSync(externalRoot, { recursive: true, force: true });
    });
    let wallClockMs = Date.parse("2026-09-28T00:00:00.000Z");
    const dateNow = vi.spyOn(Date, "now").mockImplementation(() => wallClockMs);
    cleanups.push(() => {
      dateNow.mockRestore();
    });
    plantRootOwnerClaim(externalRoot, "00000000-0000-4000-8000-000000000401", deadPid);
    const linkedTombstone = `${claimPath}.stale-00000000-0000-4000-8000-000000000401`;
    fs.symlinkSync(externalRoot, linkedTombstone, "dir");
    const lookAlike = `${claimPath}.stale-not-a-generated-uuid`;
    plantRootOwnerClaim(lookAlike, "00000000-0000-4000-8000-000000000402", deadPid);
    const extraContent = `${claimPath}.stale-00000000-0000-4000-8000-000000000403`;
    plantRootOwnerClaim(extraContent, "00000000-0000-4000-8000-000000000403", deadPid);
    fs.writeFileSync(path.join(extraContent, "unexpected.txt"), "keep\n");
    const oldSeconds = (wallClockMs - 60 * 60_000) / 1_000;
    for (const entry of [lookAlike, extraContent]) fs.utimesSync(entry, oldSeconds, oldSeconds);
    wallClockMs += 10 * 60_000;

    const ownership = await acquireDaemonRootOwnership({
      graftDir: rootDir,
      socketPath: path.join(rootDir, "daemon.sock"),
    }, liveOnlyLiveness);
    await ownership.release();

    expect(fs.lstatSync(linkedTombstone).isSymbolicLink()).toBe(true);
    expect(fs.existsSync(path.join(externalRoot, "claim.json"))).toBe(true);
    expect(fs.existsSync(path.join(lookAlike, "claim.json"))).toBe(true);
    expect(fs.readFileSync(path.join(extraContent, "unexpected.txt"), "utf-8")).toBe("keep\n");
  });

  it("keeps a delayed stale reclaimer from displacing the claim that recovered it", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-claim-aba-"));
    const ownerPath = path.join(rootDir, "daemon-owner.json");
    const claimPath = `${ownerPath}.claim`;
    const claimRecordPath = path.join(claimPath, "claim.json");
    const deadClaimId = "00000000-0000-4000-8000-000000000501";
    plantRootOwnerClaim(claimPath, deadClaimId, deadPid);
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const ownerFor = (instance: number): Parameters<typeof publishDaemonRootOwner>[1] => ({
      schemaVersion: 2,
      instanceId: `00000000-0000-4000-8000-00000000060${String(instance)}`,
      pid: process.pid,
      processStartIdentity: `live-process:${String(instance)}`,
      socketPath: path.join(rootDir, `owner-${String(instance)}.sock`),
    });

    // Both contenders read the dead claim before either acts on it. The second
    // reader is then held with that read in hand until the first has recovered
    // the claim and holds a new one.
    let deadClaimReads = 0;
    let observeSecondRead!: () => void;
    const secondRead = new Promise<void>((resolve) => {
      observeSecondRead = resolve;
    });
    let releaseDelayedReclaimer!: () => void;
    const delayedReclaimerReleased = new Promise<void>((resolve) => {
      releaseDelayedReclaimer = resolve;
    });
    readFileObserver.mockImplementation(async (filePath, _encoding, source: string) => {
      if (path.resolve(String(filePath)) !== claimRecordPath || !source.includes(deadClaimId)) return;
      deadClaimReads++;
      if (deadClaimReads === 1) {
        await secondRead;
        return;
      }
      if (deadClaimReads === 2) {
        observeSecondRead();
        await delayedReclaimerReleased;
      }
    });
    let observeDelayedRename!: (error: unknown) => void;
    const delayedRename = new Promise<unknown>((resolve) => {
      observeDelayedRename = resolve;
    });
    let takeoverRenames = 0;
    renameObserver.mockImplementation((oldPath, newPath, error) => {
      if (String(oldPath) !== claimPath || String(newPath) !== `${claimPath}.stale-${deadClaimId}`) return;
      takeoverRenames++;
      if (takeoverRenames === 2) observeDelayedRename(error);
    });
    let claimDuringHold: string | null = null;
    linkObserver.mockImplementation(async (existingPath, newPath, error) => {
      if (
        claimDuringHold !== null
        || error !== null
        || String(newPath) !== ownerPath
        || !String(existingPath).startsWith(`${ownerPath}.candidate-`)
      ) {
        return;
      }
      releaseDelayedReclaimer();
      const delayedRenameError = await delayedRename;
      expect(delayedRenameError).not.toBeNull();
      claimDuringHold = fs.readFileSync(claimRecordPath, "utf-8");
    });

    const outcomes = await Promise.all([
      publishDaemonRootOwner(ownerPath, ownerFor(1)),
      publishDaemonRootOwner(ownerPath, ownerFor(2)),
    ]);

    expect(deadClaimReads).toBe(2);
    expect(takeoverRenames).toBe(2);
    expect(claimDuringHold).not.toBeNull();
    expect(claimDuringHold).not.toContain(deadClaimId);
    expect(outcomes.filter(Boolean)).toHaveLength(1);
    const winner = outcomes[0] ? ownerFor(1) : ownerFor(2);
    expect(JSON.parse(fs.readFileSync(ownerPath, "utf-8"))).toEqual(winner);
  });

  it("enforces the owner-claim deadline when a stale claim vanishes during recovery", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-owner-claim-deadline-"));
    const ownerPath = path.join(rootDir, "daemon-owner.json");
    const claimPath = `${ownerPath}.claim`;
    const claimRecordPath = path.join(claimPath, "claim.json");
    const staleClaim = {
      schemaVersion: 1 as const,
      claimId: "00000000-0000-4000-8000-000000000001",
      pid: 2_147_483_647,
      processStartIdentity: "dead-process:100",
    };
    fs.mkdirSync(claimPath, { recursive: true });
    fs.writeFileSync(claimRecordPath, `${JSON.stringify(staleClaim)}\n`);
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let nowMs = 0;
    const performanceNow = vi.spyOn(performance, "now").mockImplementation(() => nowMs);
    cleanups.push(() => {
      performanceNow.mockRestore();
    });
    let staleClaimRemoved = false;
    readFileObserver.mockImplementation((filePath) => {
      if (staleClaimRemoved || path.resolve(String(filePath)) !== claimRecordPath) return;
      staleClaimRemoved = true;
      nowMs = 10_000;
      fs.rmSync(claimPath, { recursive: true, force: true });
    });
    const liveness = {
      socketHasActiveListener(): Promise<boolean> {
        return Promise.resolve(false);
      },
      readProcessStartIdentity(pid: number): Promise<string | null> {
        return Promise.resolve(pid === staleClaim.pid ? "replacement-process:200" : "live-process:200");
      },
    };

    await expect(acquireDaemonRootOwnership({
      graftDir: rootDir,
      socketPath: path.join(rootDir, "daemon.sock"),
    }, liveness)).rejects.toBeInstanceOf(DaemonRootOwnerClaimTimeoutError);
  });

  it("publishes a complete root owner without replacing an incumbent", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-owner-publish-"));
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gsr-owner-"));
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gsr-test-"));
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gsr-terminal-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let removalCalls = 0;
    const sessionStorage = {
      ...nodeDaemonSessionStorage,
      captureSessionDirectoryIdentity,
      writeSessionOwnershipMarker,
      removeSessionOrphanDirectories,
      async removeSessionDirectory(
        sessionDir: string,
        expectedIdentity: DaemonSessionDirectoryIdentity,
        sessionsRootAuthority: DaemonSessionsRootAuthority,
      ): Promise<boolean> {
        removalCalls++;
        if (removalCalls > 1) return false;
        return removeSessionDirectory(sessionDir, expectedIdentity, sessionsRootAuthority);
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gsr-aba-"));
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
      ...nodeDaemonSessionStorage,
      captureSessionDirectoryIdentity,
      writeSessionOwnershipMarker,
      removeSessionOrphanDirectories,
      async removeSessionDirectory(
        sessionDir: string,
        expectedIdentity: DaemonSessionDirectoryIdentity,
        sessionsRootAuthority: DaemonSessionsRootAuthority,
      ): Promise<boolean> {
        removalCalls++;
        if (removalCalls === 1) {
          markRemovalStarted();
          await removalGate;
        }
        const removed = await removeSessionDirectory(sessionDir, expectedIdentity, sessionsRootAuthority);
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-terminating-"));
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
      ...nodeDaemonSessionStorage,
      captureSessionDirectoryIdentity,
      writeSessionOwnershipMarker,
      async removeSessionDirectory(
        sessionDir: string,
        expectedIdentity: DaemonSessionDirectoryIdentity,
        sessionsRootAuthority: DaemonSessionsRootAuthority,
      ): Promise<boolean> {
        markRemovalStarted();
        await removalGate;
        return removeSessionDirectory(sessionDir, expectedIdentity, sessionsRootAuthority);
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

  it("retries failed transport-triggered cleanup as an orphan on the next sweep", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-callback-failure-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let markRemovalAttempted!: () => void;
    const removalAttempted = new Promise<void>((resolve) => {
      markRemovalAttempted = resolve;
    });
    const sessionStorage = {
      ...nodeDaemonSessionStorage,
      captureSessionDirectoryIdentity,
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
    cleanups.push(() => {
      protocolClose.mockRestore();
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

    const sessionDir = path.join(rootDir, "sessions", sessionId!);
    expect(fs.existsSync(sessionDir)).toBe(true);

    await expect(daemon.reapExpiredSessions()).resolves.toMatchObject({
      sessionsRetired: 0,
      liveDirectoriesRemoved: 0,
      orphanDirectoriesRemoved: 1,
      cleanupFailures: [],
      preservedEntries: [],
      sweepFailure: null,
    });
    expect(fs.existsSync(sessionDir)).toBe(false);
    expect(protocolClose).not.toHaveBeenCalled();
  });

  it("converges transport errors on the shared session termination operation", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-transport-error-"));
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-close-fence-"));
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
      ...nodeDaemonSessionStorage,
      captureSessionDirectoryIdentity,
      writeSessionOwnershipMarker,
      removeSessionOrphanDirectories,
      async removeSessionDirectory(
        sessionDir: string,
        expectedIdentity: DaemonSessionDirectoryIdentity,
        sessionsRootAuthority: DaemonSessionsRootAuthority,
      ): Promise<boolean> {
        markRemovalStarted();
        await removalGate;
        return removeSessionDirectory(sessionDir, expectedIdentity, sessionsRootAuthority);
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gsr-retry-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let currentTimeMs = 1_000_000;
    let failNextRemoval = true;
    const sessionStorage = {
      ...nodeDaemonSessionStorage,
      captureSessionDirectoryIdentity,
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

  it("refuses to recreate a missing established sessions root during live cleanup", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-root-missing-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    const sessionsRoot = path.join(rootDir, "sessions");
    const parkedSessionsRoot = path.join(rootDir, "sessions-parked");
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
    const sessionId = await initializeDaemonSession(socketPath, 1);
    const sessionDir = path.join(sessionsRoot, sessionId);
    fs.writeFileSync(path.join(sessionDir, "original.txt"), "original\n");
    fs.renameSync(sessionsRoot, parkedSessionsRoot);

    currentTimeMs += 10_001;
    const sweep = await daemon.reapExpiredSessions();

    expect(sweep).toMatchObject({
      sessionsRetired: 1,
      liveDirectoriesRemoved: 0,
      orphanDirectoriesRemoved: 0,
    });
    expect(sweep.cleanupFailures).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "SESSION_DIRECTORY_REMOVE_FAILED",
        sessionId,
        path: sessionDir,
        retryable: true,
      }),
      expect.objectContaining({
        code: "ORPHAN_SCAN_FAILED",
        sessionId: null,
        path: sessionsRoot,
        retryable: true,
      }),
    ]));
    expect(fs.existsSync(sessionsRoot)).toBe(false);
    expect(fs.readFileSync(path.join(parkedSessionsRoot, sessionId, "original.txt"), "utf-8"))
      .toBe("original\n");
  });

  it("settles the session-start runtime log write before initialize returns", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-start-log-settled-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    const sessionsRoot = path.join(rootDir, "sessions");
    const parkedSessionsRoot = path.join(rootDir, "sessions-parked");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    // The session-start write is held until one of two events: construction
    // asking to wait for it (a correct host), or the initialize response
    // arriving (a host that hands the session out first). The oracle is the
    // order of the write settling and the response arriving; no timer decides it.
    let releaseStartWrite!: () => void;
    const startWriteGate = new Promise<void>((resolve) => {
      releaseStartWrite = resolve;
    });
    cleanups.push(() => {
      releaseStartWrite();
    });
    let markStartWriteSettled!: () => void;
    const startWriteSettled = new Promise<void>((resolve) => {
      markStartWriteSettled = resolve;
    });
    let responseReceived = false;
    let responseReceivedBeforeStartWriteSettled: boolean | null = null;
    const originalAppend = Reflect.get(RotatingNdjsonLog.prototype, "append") as (
      this: RotatingNdjsonLog,
      entry: object,
    ) => Promise<void>;
    const append = vi.spyOn(RotatingNdjsonLog.prototype, "append")
      .mockImplementation(async function(this: RotatingNdjsonLog, entry: object) {
        if ((entry as { event?: unknown }).event !== "session_started") {
          await Reflect.apply(originalAppend, this, [entry]);
          return;
        }
        await startWriteGate;
        try {
          await Reflect.apply(originalAppend, this, [entry]);
        } finally {
          responseReceivedBeforeStartWriteSettled = responseReceived;
          markStartWriteSettled();
        }
      });
    cleanups.push(() => {
      append.mockRestore();
    });
    const originalCreateGraftServer = graftServerModule.createGraftServer;
    const createServer = vi.spyOn(graftServerModule, "createGraftServer")
      .mockImplementation((...args: Parameters<typeof originalCreateGraftServer>) => {
        const server = originalCreateGraftServer(...args);
        const whenSessionStarted = server.whenSessionStarted.bind(server);
        return {
          ...server,
          whenSessionStarted(): Promise<void> {
            releaseStartWrite();
            return whenSessionStarted();
          },
        };
      });
    cleanups.push(() => {
      createServer.mockRestore();
    });
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
    });
    cleanups.push(async () => {
      if (fs.existsSync(parkedSessionsRoot) && !fs.existsSync(sessionsRoot)) {
        fs.renameSync(parkedSessionsRoot, sessionsRoot);
      }
      await daemon.close().catch(() => undefined);
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
    responseReceived = true;
    releaseStartWrite();
    expect(initialize.statusCode).toBe(200);
    fs.renameSync(sessionsRoot, parkedSessionsRoot);
    await startWriteSettled;

    expect(responseReceivedBeforeStartWriteSettled).toBe(false);
    expect(fs.existsSync(sessionsRoot)).toBe(false);
  });

  it.skipIf(process.platform === "win32")("retries live cleanup after the exact sessions root is restored", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-root-retry-"));
    const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gs-root-retry-target-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    const sessionsRoot = path.join(rootDir, "sessions");
    const parkedSessionsRoot = path.join(rootDir, "sessions-parked");
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
    const sessionDir = path.join(sessionsRoot, sessionId!);
    fs.renameSync(sessionsRoot, parkedSessionsRoot);
    fs.symlinkSync(externalRoot, sessionsRoot, "dir");

    currentTimeMs += 10_001;
    const refusedSweep = await daemon.reapExpiredSessions();
    expect(refusedSweep).toMatchObject({
      sessionsRetired: 1,
      liveDirectoriesRemoved: 0,
      orphanDirectoriesRemoved: 0,
    });
    expect(refusedSweep.cleanupFailures).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "SESSION_DIRECTORY_REMOVE_FAILED",
        sessionId,
        path: sessionDir,
        retryable: true,
      }),
    ]));

    fs.unlinkSync(sessionsRoot);
    fs.renameSync(parkedSessionsRoot, sessionsRoot);
    expect(await daemon.reapExpiredSessions()).toMatchObject({
      sessionsRetired: 0,
      liveDirectoriesRemoved: 0,
      orphanDirectoriesRemoved: 1,
      cleanupFailures: [],
    });
    expect(fs.existsSync(sessionDir)).toBe(false);
  });

  it("marks an unsafe orphan-path refusal as non-retryable and other orphan failures as retryable", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-unsafe-orphan-path-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const unsafeSessionId = "11111111-1111-4111-8111-111111111111";
    const busySessionId = "22222222-2222-4222-8222-222222222222";
    const unsafePath = path.join(rootDir, "sessions", unsafeSessionId);
    const busyPath = path.join(rootDir, "sessions", busySessionId);
    let injectOrphanFailures = false;
    const sessionStorage = {
      ...nodeDaemonSessionStorage,
      captureSessionDirectoryIdentity,
      writeSessionOwnershipMarker,
      removeSessionDirectory,
      async removeSessionOrphanDirectories(
        ...args: Parameters<typeof removeSessionOrphanDirectories>
      ): ReturnType<typeof removeSessionOrphanDirectories> {
        if (!injectOrphanFailures) return removeSessionOrphanDirectories(...args);
        return {
          removed: 0,
          failures: [
            {
              sessionId: unsafeSessionId,
              path: unsafePath,
              error: new UnsafeDaemonSessionDirectoryError(unsafePath),
            },
            {
              sessionId: busySessionId,
              path: busyPath,
              error: Object.assign(new Error("injected busy orphan"), { code: "EBUSY" }),
            },
          ],
          preservedEntries: [],
        };
      },
    };
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionReaperIntervalMs: 0,
      sessionStorage,
    });
    cleanups.push(() => daemon.close());
    injectOrphanFailures = true;

    const sweep = await daemon.reapExpiredSessions();

    expect(sweep.cleanupFailures).toEqual([
      expect.objectContaining({
        code: "ORPHAN_DIRECTORY_REMOVE_FAILED",
        sessionId: unsafeSessionId,
        path: unsafePath,
        retryable: false,
      }),
      expect.objectContaining({
        code: "ORPHAN_DIRECTORY_REMOVE_FAILED",
        sessionId: busySessionId,
        path: busyPath,
        retryable: true,
      }),
    ]);
  });

  it("keeps an unsafe-path refusal non-retryable when a failed restore wraps it", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-unsafe-wrapped-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const orphanSessionId = "33333333-3333-4333-8333-333333333333";
    const orphanPath = path.join(rootDir, "sessions", orphanSessionId);
    // The shape storage throws when it refuses a replaced directory and the
    // rename that would restore it from quarantine then fails too.
    const restoreFailed = (refusedPath: string): AggregateError => new AggregateError(
      [
        new UnsafeDaemonSessionDirectoryError(refusedPath),
        Object.assign(new Error("injected restore rename failure"), { code: "EBUSY" }),
      ],
      `Failed to restore refused daemon session directory: ${refusedPath}`,
    );
    let injectFailures = false;
    const sessionStorage = {
      ...nodeDaemonSessionStorage,
      captureSessionDirectoryIdentity,
      writeSessionOwnershipMarker,
      async removeSessionDirectory(
        ...args: Parameters<typeof removeSessionDirectory>
      ): ReturnType<typeof removeSessionDirectory> {
        if (!injectFailures) return removeSessionDirectory(...args);
        throw restoreFailed(args[0]);
      },
      async removeSessionOrphanDirectories(
        ...args: Parameters<typeof removeSessionOrphanDirectories>
      ): ReturnType<typeof removeSessionOrphanDirectories> {
        if (!injectFailures) return removeSessionOrphanDirectories(...args);
        return {
          removed: 0,
          failures: [{ sessionId: orphanSessionId, path: orphanPath, error: restoreFailed(orphanPath) }],
          preservedEntries: [],
        };
      },
    };
    let currentTimeMs = 1_000_000;
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      sessionInactivityTtlMs: 10_000,
      sessionReaperIntervalMs: 0,
      sessionStorage,
      nowMs: () => currentTimeMs,
    });
    cleanups.push(() => daemon.close());
    const liveSessionId = await initializeDaemonSession(socketPath, 1);
    currentTimeMs += 10_000;
    injectFailures = true;

    const sweep = await daemon.reapExpiredSessions();

    expect(sweep.cleanupFailures.map((failure) => ({
      code: failure.code,
      sessionId: failure.sessionId,
      retryable: failure.retryable,
    }))).toEqual([
      { code: "SESSION_DIRECTORY_REMOVE_FAILED", sessionId: liveSessionId, retryable: false },
      { code: "ORPHAN_DIRECTORY_REMOVE_FAILED", sessionId: orphanSessionId, retryable: false },
    ]);
  });

  it.skipIf(process.platform === "win32")("marks an unsafe live-session path refusal as non-retryable", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-unsafe-live-path-"));
    const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gs-unsafe-target-"));
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

  it("preserves a live-session directory replacement made before cleanup starts", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gls-child-swap-"));
    const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gls-child-target-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    const displacedSession = path.join(rootDir, "displaced-session");
    fs.writeFileSync(path.join(externalRoot, "keep.txt"), "external\n");
    fs.writeFileSync(
      path.join(externalRoot, ".graft-session-owner.json"),
      `${JSON.stringify({
        schemaVersion: 1,
        daemonInstanceId: "00000000-0000-4000-8000-000000000099",
        sessionId: "00000000-0000-4000-8000-000000000099",
      })}\n`,
    );
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
    fs.writeFileSync(path.join(sessionDir, "original.txt"), "original\n");
    fs.renameSync(sessionDir, displacedSession);
    fs.renameSync(externalRoot, sessionDir);

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
    expect(fs.readFileSync(path.join(sessionDir, "keep.txt"), "utf-8")).toBe("external\n");
    expect(fs.readFileSync(path.join(displacedSession, "original.txt"), "utf-8"))
      .toBe("original\n");
  });

  it("reports protocol and fallback transport close failures as non-retryable", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-close-failures-"));
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-shutdown-failure-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const sessionStorage = {
      ...nodeDaemonSessionStorage,
      captureSessionDirectoryIdentity,
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-shutdown-sweep-failure-"));
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
      ...nodeDaemonSessionStorage,
      captureSessionDirectoryIdentity,
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-signal-failure-"));
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
      ...nodeDaemonSessionStorage,
      captureSessionDirectoryIdentity,
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
      expect(consoleError).toHaveBeenCalledWith({
        code: "DAEMON_SIGNAL_SHUTDOWN_FAILED",
        error: expect.any(AggregateError),
      });
      expect(process.exitCode).toBe(1);
    });
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    expect(unhandledRejections).toEqual([]);
  });

  it("does not reap sessions that have active in-flight requests even if expired", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gsr-inflight-"));
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gsr-refcount-"));
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gsr-body-"));
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gsr-touch-"));
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-preconnect-"));
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-marker-failure-"));
    const socketPath = path.join(rootDir, "daemon.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    const markerFailure = new Error("injected session ownership marker failure");
    const sessionStorage = {
      ...nodeDaemonSessionStorage,
      captureSessionDirectoryIdentity,
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

  it("rolls back partial control-plane publication during session construction", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-register-failure-"));
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

  it("removes the unmarked session directory when identity capture fails on a custom endpoint", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-identity-capture-"));
    const socketPath = path.join(rootDir, "custom.sock");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let failNextCapture = true;
    const sessionStorage = {
      ...nodeDaemonSessionStorage,
      async captureSessionDirectoryIdentity(
        sessionDir: string,
      ): Promise<DaemonSessionDirectoryIdentity> {
        if (failNextCapture) {
          failNextCapture = false;
          throw Object.assign(new Error("injected identity capture failure"), { code: "EIO" });
        }
        return captureSessionDirectoryIdentity(sessionDir);
      },
      writeSessionOwnershipMarker,
      removeSessionDirectory,
      removeSessionOrphanDirectories,
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
    expect(failNextCapture).toBe(false);
    expect(daemon.getHealthStatus().activeSessions).toBe(0);
    expect(fs.readdirSync(path.join(rootDir, "sessions"))).toEqual([]);
    expect((await daemon.reapExpiredSessions()).preservedEntries).toEqual([]);
  });

  it("rolls back an unpublished staging directory through the injected session storage", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-staging-rollback-"));
    const socketPath = path.join(rootDir, "custom.sock");
    const sessionsRoot = path.join(rootDir, "sessions");
    cleanups.push(() => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    });
    let failNextCapture = true;
    const stagingRemovals: string[] = [];
    const sessionStorage = {
      ...nodeDaemonSessionStorage,
      async captureSessionDirectoryIdentity(
        sessionDir: string,
      ): Promise<DaemonSessionDirectoryIdentity> {
        if (failNextCapture) {
          failNextCapture = false;
          throw Object.assign(new Error("injected identity capture failure"), { code: "EIO" });
        }
        return captureSessionDirectoryIdentity(sessionDir);
      },
      writeSessionOwnershipMarker,
      removeSessionDirectory,
      removeSessionOrphanDirectories,
      removeSessionStagingDirectory(stagingDir: string): Promise<void> {
        stagingRemovals.push(stagingDir);
        return Promise.reject(Object.assign(new Error("injected staging rmdir failure"), { code: "EBUSY" }));
      },
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
    expect(failNextCapture).toBe(false);
    // The injected rollback ran and its failure took effect: the staging
    // directory it refused to remove is still there.
    expect(stagingRemovals).toHaveLength(1);
    expect(path.dirname(stagingRemovals[0]!)).toBe(sessionsRoot);
    expect(path.basename(stagingRemovals[0]!)).toMatch(/^\.graft-staging-[0-9a-f-]{36}$/u);
    expect(fs.readdirSync(sessionsRoot)).toEqual([path.basename(stagingRemovals[0]!)]);
    expect(daemon.getHealthStatus().activeSessions).toBe(0);
  });

  it("rolls back a session when transport connection fails", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gsr-connect-"));
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-rollback-errors-"));
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gsr-server-"));
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
