import { afterEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import type * as http from "node:http";
import { createDaemonInspectionRoute } from "../../../src/mcp/daemon-inspection-route.js";
import { DaemonInspectionQuery } from "../../../src/operations/daemon-inspection.js";
import { INSPECTION_LIMITS } from "../../../src/contracts/daemon-inspection.js";

class Response extends EventEmitter {
  code = 0;
  body = "";
  destroyed = false;
  writeHead(code: number) { this.code = code; }
  end(body: string) { this.body = body; }
  destroy() { this.destroyed = true; this.emit("close"); }
}
const asResponse = (res: Response) => res as unknown as http.ServerResponse;
const req = (url = "/inspect/v1", method = "GET") => ({ url, method, headers: {} }) as http.IncomingMessage;
function query() {
  return new DaemonInspectionQuery({ now: () => "2026-09-07T00:00:00.000Z", runtime: {
    incarnationId: "i", startedAt: "2026-09-07T00:00:00.000Z", pid: 1, version: "test", modulePath: "/test", executablePath: "/node", socketPath: "/d.sock",
  }, source: { sessions: () => [], workspaces: () => [], jobs: () => [], workers: () => [], monitors: () => [], hasSession: () => false,
    counters: () => ({ scheduler: { completed: 0, failed: 0 }, workers: { completed: 0, failed: 0 } }), pool: () => ({ repositoryKeys: 0 }) } });
}
afterEach(() => { vi.useRealTimers(); });

describe("inspection observer limits", () => {
  it("bounds concurrent responses and releases observer capacity on completion or deadline", () => {
    vi.useFakeTimers();
    const observation = query();
    const capture = vi.fn(() => observation.capture({}));
    const route = createDaemonInspectionRoute(capture);
    const responses = Array.from({ length: 4 }, () => new Response());
    for (const res of responses) expect(route.handle(req(), asResponse(res))).toBe(true);
    const denied = new Response(); route.handle(req(), asResponse(denied));
    expect(denied.code).toBe(503);
    expect(JSON.parse(denied.body).code).toBe("INSPECTION_OBSERVER_LIMIT");
    expect(capture).toHaveBeenCalledTimes(4);
    responses[0]!.emit("finish");
    const next = new Response(); route.handle(req(), asResponse(next)); expect(next.code).toBe(200);
    vi.advanceTimersByTime(INSPECTION_LIMITS.timeoutMs);
    expect(responses.slice(1).every(r => r.destroyed)).toBe(true);
    expect(next.destroyed).toBe(true);
    const afterDeadline = new Response(); route.handle(req(), asResponse(afterDeadline)); expect(afterDeadline.code).toBe(200);
    route.close(); expect(afterDeadline.destroyed).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("bounds the response without emitting incomplete JSON or claiming a partial capture is complete", () => {
    vi.useFakeTimers();
    const source = query().capture({});
    const identity = { repoId: "repo", worktreeId: "worktree", worktreeRoot: "p".repeat(500) };
    const opened = { ...identity, openedAt: source.runtime.startedAt, lastActivatedAt: null };
    // Deliberately invalid oversized provider; the boundary must fail closed.
    source.sessions.rows = Array.from({ length: 100 }, (_, i) => ({
      sessionId: `s${String(i)}`, startedAt: source.runtime.startedAt, lastActivityAt: source.runtime.startedAt,
      activeWorkspace: identity, reportedClient: null, reportedClientAvailability: "not_retained",
      openedWorkspaces: { availability: "available", completeness: "complete", returned: 100, matchingTotal: 100, reason: null, rows: Array.from({ length: 100 }, () => opened) },
    }));
    source.sessions.returned = 100; source.sessions.matchingTotal = 100;
    const route = createDaemonInspectionRoute(() => source);
    const res = new Response(); route.handle(req(), asResponse(res));
    expect(res.code).toBe(503);
    expect(JSON.parse(res.body)).toHaveProperty("code");
    expect(Buffer.byteLength(res.body)).toBeLessThan(INSPECTION_LIMITS.bytes);
    route.close();
  });

  it("enforces the encoded byte cap even when record cardinality is valid", () => {
    vi.useFakeTimers();
    const source = query().capture({});
    const wide = "x".repeat(500);
    const identity = { repoId: wide, worktreeId: wide, worktreeRoot: wide };
    const opened = { ...identity, openedAt: source.runtime.startedAt, lastActivatedAt: null };
    source.sessions.rows = Array.from({ length: 100 }, () => ({
      sessionId: wide, startedAt: source.runtime.startedAt, lastActivityAt: source.runtime.startedAt, activeWorkspace: identity,
      reportedClient: { name: wide, version: wide, verification: "client_reported" }, reportedClientAvailability: "available",
      openedWorkspaces: { availability: "available", completeness: "complete", returned: 3, matchingTotal: 3, reason: null, rows: [opened, opened, opened] },
    }));
    source.sessions.returned = 100; source.sessions.matchingTotal = 100;
    const route = createDaemonInspectionRoute(() => source);
    const res = new Response(); route.handle(req(), asResponse(res));
    expect(res.code).toBe(503);
    expect(JSON.parse(res.body).code).toBe("INSPECTION_RESPONSE_TOO_LARGE");
    route.close();
  });

  it("rejects oversized/duplicate/unknown input before invoking a projection", () => {
    const capture = vi.fn(() => query().capture({}));
    const route = createDaemonInspectionRoute(capture);
    for (const url of ["/inspect/v1?repoId=" + "r".repeat(4096), "/inspect/v1?limit=1&limit=2", "/inspect/v1?unknown=x", "/inspect/v99"]) {
      const res = new Response(); expect(route.handle(req(url), asResponse(res))).toBe(true); expect(res.code).toBeGreaterThanOrEqual(400);
    }
    expect(capture).not.toHaveBeenCalled();
    expect(route.handle(req("/mcp"), asResponse(new Response()))).toBe(false);
  });
});
