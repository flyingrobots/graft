import { afterEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as http from "node:http";
import * as os from "node:os";
import * as path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { startDaemonServer, type GraftDaemonServer } from "../../../src/mcp/daemon-server.js";
import { createLocalSocketFetch } from "../../../src/mcp/daemon-stdio-bridge.js";
import { inspectLocalDaemon } from "../../../src/adapters/local-daemon-inspection-client.js";
import { DaemonControlPlane } from "../../../src/mcp/daemon-control-plane.js";
import { DaemonJobScheduler } from "../../../src/mcp/daemon-job-scheduler.js";
import { ChildProcessDaemonWorkerPool } from "../../../src/mcp/daemon-worker-pool.js";
import { InMemoryWarpPool } from "../../../src/mcp/warp-pool.js";
import { WorkspaceRouter } from "../../../src/mcp/workspace-router.js";
import { ObservationCache } from "../../../src/operations/observation-cache.js";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { nodeFs } from "../../../src/adapters/node-fs.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";
import { GRAFT_VERSION } from "../../../src/version.js";

vi.mock("node:http", async importOriginal => {
  const actual = await importOriginal<typeof import("node:http")>();
  return { ...actual, request: vi.fn(actual.request) };
});

describe("dedicated daemon inspection transport", () => {
  const daemons: GraftDaemonServer[] = [];
  const clients: Client[] = [];
  const roots: string[] = [];
  const repos: string[] = [];
  const servers: http.Server[] = [];
  afterEach(async () => {
    vi.restoreAllMocks();
    for (const client of clients.splice(0)) await client.close();
    for (const daemon of daemons.splice(0)) await daemon.close();
    for (const server of servers.splice(0)) await new Promise<void>(resolve => { server.close(() => { resolve(); }); });
    for (const repo of repos.splice(0)) cleanupTestRepo(repo);
    for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
    process.exitCode = 0;
  });
  function root() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-inspect-")); roots.push(dir); return dir;
  }
  async function daemon() {
    const dir = root();
    const result = await startDaemonServer({ graftDir: dir, socketPath: path.join(dir, "d.sock"), workerPoolSize: 1, persistedLocalHistoryGraph: false });
    daemons.push(result); return { daemon: result, dir };
  }
  async function stub(handler: http.RequestListener) {
    const socketPath = path.join(root(), "d.sock");
    const server = http.createServer(handler); servers.push(server);
    await new Promise<void>(resolve => server.listen(socketPath, resolve)); return socketPath;
  }

  it("inspects registered/opened sessions repeatedly without workload, cache, graph, discovery or scheduling effects", async () => {
    const { daemon: d, dir } = await daemon();
    const repo = createTestRepo("graft-inspect-workspace-"); repos.push(repo);
    fs.writeFileSync(path.join(repo, "a.ts"), "export const a = 1;\n");
    git(repo, "add a.ts"); git(repo, "commit -m init");
    const client = new Client({ name: "graft-inspector", version: "claimed" }); clients.push(client);
    const transport = new StreamableHTTPClientTransport(new URL("http://graft/mcp"), { fetch: createLocalSocketFetch(d.socketPath) });
    await client.connect(transport as unknown as Parameters<Client["connect"]>[0]);
    await client.callTool({ name: "workspace_authorize", arguments: { cwd: repo } });
    await client.callTool({ name: "workspace_open", arguments: { cwd: repo } });
    const before = await inspectLocalDaemon({ socketPath: d.socketPath });
    expect(before.status).toBe("ok");
    if (before.status !== "ok") throw new Error("inspection failed");
    expect(before.observation.sessions.rows).toHaveLength(1);
    expect(before.observation.sessions.rows[0]?.reportedClient).toEqual({ name: "graft-inspector", version: "claimed", verification: "client_reported" });
    expect(before.observation.sessions.rows[0]?.openedWorkspaces.rows).toHaveLength(1);
    const directories = fs.readdirSync(path.join(dir, "sessions"));
    // These fail even when a hidden getter performs no filesystem write.
    const trap = () => { throw new Error("PROHIBITED_INSPECTION_EFFECT"); };
    const traps = [
      vi.spyOn(DaemonControlPlane.prototype, "registerTransport").mockImplementation(trap),
      vi.spyOn(DaemonControlPlane.prototype, "touchTransport").mockImplementation(trap),
      vi.spyOn(DaemonControlPlane.prototype, "noteBound").mockImplementation(trap),
      vi.spyOn(DaemonJobScheduler.prototype, "enqueue").mockImplementation(trap),
      vi.spyOn(InMemoryWarpPool.prototype, "getOrOpen").mockImplementation(trap),
      vi.spyOn(WorkspaceRouter.prototype, "captureExecutionContext").mockImplementation(trap),
      vi.spyOn(WorkspaceRouter.prototype, "captureExecutionContextForWorkspace").mockImplementation(trap),
      vi.spyOn(ObservationCache.prototype, "get").mockImplementation(trap),
      vi.spyOn(ObservationCache.prototype, "record").mockImplementation(trap),
      vi.spyOn(ObservationCache.prototype, "applySnapshot").mockImplementation(trap),
      vi.spyOn(nodeGit, "run").mockImplementation(trap),
      vi.spyOn(nodeFs, "readFile").mockImplementation(trap),
      vi.spyOn(nodeFs, "writeFile").mockImplementation(trap),
    ];
    for (let n = 0; n < 5; n++) {
      const next = await inspectLocalDaemon({ socketPath: d.socketPath });
      expect(next.status).toBe("ok");
      if (next.status !== "ok") throw new Error("inspection failed");
      const { capture: _before, ...oldState } = before.observation;
      const { capture: _after, ...newState } = next.observation;
      expect(newState).toEqual(oldState);
      expect(next.observation.capture.sequence).toBeGreaterThan(before.observation.capture.sequence);
    }
    for (const effect of traps) expect(effect).not.toHaveBeenCalled();
    expect(fs.readdirSync(path.join(dir, "sessions"))).toEqual(directories);
  });

  it("returns an exact empty inventory without creating a session, and changes incarnation after restart", async () => {
    const { daemon: first, dir } = await daemon();
    const a = await inspectLocalDaemon({ socketPath: first.socketPath });
    expect(a.status).toBe("ok");
    if (a.status !== "ok") throw new Error("inspection failed");
    expect(a.observation.sessions).toMatchObject({ rows: [], matchingTotal: 0, completeness: "complete" });
    expect(a.observation.runtime.version).toBe(GRAFT_VERSION);
    expect(first.getHealthStatus().activeSessions).toBe(0);
    await first.close(); daemons.splice(daemons.indexOf(first), 1);
    const absent = await inspectLocalDaemon({ socketPath: first.socketPath });
    expect(absent.status).toBe("no_daemon");
    expect(fs.existsSync(first.socketPath)).toBe(false);
    const second = await startDaemonServer({ graftDir: dir, socketPath: first.socketPath, workerPoolSize: 1 }); daemons.push(second);
    const b = await inspectLocalDaemon({ socketPath: second.socketPath });
    if (b.status !== "ok") throw new Error("inspection failed");
    expect(b.observation.runtime.incarnationId).not.toBe(a.observation.runtime.incarnationId);
    expect(b.observation.capture.sequence).toBe(1);
    // The old frame remains its historical value, never relabelled as this daemon.
    expect(a.observation.runtime.incarnationId).not.toBe(b.observation.history.incarnationId);
  });

  it("retains the admitted worktree while a real scheduled request is held across rebind", async () => {
    const { daemon: d } = await daemon();
    const repo = createTestRepo("graft-inspect-route-"); repos.push(repo);
    fs.writeFileSync(path.join(repo, "a.ts"), "export const a = 1;\n");
    git(repo, "add a.ts"); git(repo, "commit -m init");
    const secondRoot = path.join(root(), "checkout");
    git(repo, `worktree add -b inspection-other ${secondRoot}`);
    const client = new Client({ name: "workload", version: "test" }); clients.push(client);
    const transport = new StreamableHTTPClientTransport(new URL("http://graft/mcp"), { fetch: createLocalSocketFetch(d.socketPath) });
    await client.connect(transport as unknown as Parameters<Client["connect"]>[0]);
    for (const cwd of [repo, secondRoot]) await client.callTool({ name: "workspace_authorize", arguments: { cwd } });
    await client.callTool({ name: "workspace_open", arguments: { cwd: repo } });
    let release!: () => void;
    let admit!: (job: import("../../../src/mcp/repo-tool-job.js").RepoToolWorkerJob) => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const entered = new Promise<import("../../../src/mcp/repo-tool-job.js").RepoToolWorkerJob>(resolve => { admit = resolve; });
    // eslint-disable-next-line @typescript-eslint/unbound-method -- Invoked with the original receiver via call below.
    const original = ChildProcessDaemonWorkerPool.prototype.runRepoTool;
    vi.spyOn(ChildProcessDaemonWorkerPool.prototype, "runRepoTool").mockImplementation(function (this: ChildProcessDaemonWorkerPool, job) {
      admit(job);
      return gate.then(() => original.call(this, job));
    });
    const pending = client.callTool({ name: "file_outline", arguments: { path: "a.ts", cwd: repo } });
    try {
      const admitted = await Promise.race([entered, pending.then(() => { throw new Error("Request finished before worker admission"); })]);
      await client.callTool({ name: "workspace_open", arguments: { cwd: secondRoot } });
      const frame = await inspectLocalDaemon({ socketPath: d.socketPath, request: { sessionId: admitted.sessionId } });
      if (frame.status !== "ok") throw new Error("inspection failed");
      expect(frame.observation.sessions.rows[0]?.activeWorkspace?.worktreeId).not.toBe(admitted.worktreeId);
      expect(frame.observation.sessions.rows[0]?.openedWorkspaces.rows).toHaveLength(2);
      expect(frame.observation.jobs.rows).toEqual([expect.objectContaining({
        sessionId: admitted.sessionId, worktreeId: admitted.worktreeId, repoId: admitted.repoId, state: "running",
      })]);
    } finally { release(); await pending; }
  }, 20_000); // Medium integration: real Git worktrees, HTTP and a cold parser child; gates control the schedule.

  it("reports an older daemon as unsupported without falling back to MCP or health", async () => {
    const requests: string[] = [];
    const socketPath = await stub((req, res) => { requests.push(req.url ?? ""); res.writeHead(404); res.end("not supported"); });
    expect(await inspectLocalDaemon({ socketPath })).toMatchObject({ status: "unsupported", reason: "DAEMON_INSPECTION_UNSUPPORTED" });
    expect(requests).toEqual(["/inspect/v1?"]);
  });

  it.each([
    { field: "sessionId", request: { sessionId: undefined, limit: 7 }, expected: { limit: "7" } },
    { field: "workspaceId", request: { workspaceId: undefined, sessionId: "session:valid", limit: 4 }, expected: { sessionId: "session:valid", limit: "4" } },
    { field: "repoId", request: { repoId: undefined, limit: 7 }, expected: { limit: "7" } },
    { field: "limit", request: { limit: undefined, repoId: "repo:valid" }, expected: { repoId: "repo:valid" } },
  ])("omits an undefined $field from the wire filter", async ({ request, expected }) => {
    // Oracle: an optional undefined field is absence; defined selectors and limits survive unchanged.
    const received: Record<string, string>[] = [];
    const socketPath = await stub((req, res) => {
      received.push(Object.fromEntries(new URL(req.url ?? "/", "http://graft").searchParams));
      res.writeHead(404); res.end();
    });
    expect((await inspectLocalDaemon({ socketPath, request })).status).toBe("unsupported");
    expect(received).toEqual([expected]);
  });

  it("refuses an empty or remote address instead of falling through to a TCP request", async () => {
    const request = vi.mocked(http.request);
    request.mockClear();
    for (const socketPath of ["", "localhost:80", "http://example.invalid", "relative.sock"]) {
      expect(await inspectLocalDaemon({ socketPath })).toMatchObject({ status: "observation_failed", reason: "INVALID_LOCAL_SOCKET" });
    }
    expect(request).not.toHaveBeenCalled();
  });

  it("refuses unknown schemas, invalid bodies, disconnects and oversized responses explicitly", async () => {
    for (const [body, status] of [[JSON.stringify({ schemaVersion: "99" }), "unsupported"], ["{}", "observation_failed"], ["x".repeat(524289), "observation_failed"]]) {
      const socketPath = await stub((_req, res) => { res.end(body); });
      expect((await inspectLocalDaemon({ socketPath })).status).toBe(status);
    }
    const broken = await stub((_req, res) => { res.writeHead(200, { "content-length": "100" }); res.write("{"); res.destroy(); });
    expect((await inspectLocalDaemon({ socketPath: broken })).status).toBe("observation_failed");
  });

  it("rejects mutation methods and malformed filters without touching a workload session", async () => {
    const { daemon: d } = await daemon();
    const fetch = createLocalSocketFetch(d.socketPath);
    for (const [method, query, status] of [["POST", "", 405], ["GET", "?limit=0", 400], ["GET", "?repoId=r&repoId=x", 400], ["GET", "?cwd=/unknown", 400], ["GET", "?repoId=r&sessionId=s", 400]] as const) {
      expect((await fetch(`http://graft/inspect/v1${query}`, { method })).status).toBe(status);
    }
    expect(d.getHealthStatus().activeSessions).toBe(0);
  });
});
