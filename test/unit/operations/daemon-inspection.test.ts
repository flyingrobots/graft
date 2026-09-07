import { describe, expect, it } from "vitest";
import { DaemonInspectionQuery } from "../../../src/operations/daemon-inspection.js";
import { inspectionObservationSchema } from "../../../src/contracts/daemon-inspection.js";
import type { InspectionSource, InspectionSession, InspectionWorkspace, InspectionJob } from "../../../src/ports/daemon-inspection.js";

const startedAt = "2026-09-07T10:00:00.000Z";
const a = { repoId: "repo:r", worktreeId: "worktree:a", worktreeRoot: "/r/a" };
const b = { repoId: "repo:r", worktreeId: "worktree:b", worktreeRoot: "/r/b" };
const opened = (workspace = a) => ({ ...workspace, openedAt: startedAt, lastActivatedAt: startedAt });
const session = (id = "s", active = b): InspectionSession => ({
  sessionId: id, startedAt, lastActivityAt: startedAt, activeWorkspace: active,
  reportedClient: null, openedWorkspaces: () => [opened(a), opened(b)],
});
const workspace = (identity = a): InspectionWorkspace => ({ ...identity, authorizedAt: startedAt });
const job = (id = "j"): InspectionJob => ({
  jobId: id, sessionId: "s", repoId: a.repoId, worktreeId: a.worktreeId,
  sliceId: "slice:a", writerId: "writer:s", tool: "file_outline", kind: "repo_tool",
  priority: "interactive", state: "running", enqueuedAt: startedAt, startedAt,
});

function fixture() {
  const state = {
    sessions: [session()], workspaces: [workspace(a), workspace(b)], jobs: [job()],
    now: "2026-09-07T10:01:00.000Z",
  };
  const source: InspectionSource = {
    sessions: (id) => id === undefined ? state.sessions : state.sessions.filter(s => s.sessionId === id),
    workspaces: () => state.workspaces,
    jobs: () => state.jobs,
    workers: () => [], monitors: () => [],
    hasSession: (id) => state.sessions.some(s => s.sessionId === id),
    counters: () => ({ scheduler: { completed: 4, failed: 2 }, workers: { completed: 4, failed: 2 } }),
    pool: () => ({ repositoryKeys: 1 }),
  };
  const query = new DaemonInspectionQuery({ source, now: () => state.now, runtime: {
    incarnationId: "incarnation:one", startedAt, pid: 42, version: "0.13.0",
    modulePath: "/install/daemon.js", executablePath: "/node", socketPath: "/daemon.sock",
  } });
  return { state, source, query };
}

describe("bounded daemon observation", () => {
  it("keeps opened membership, default route, and each job's admitted route distinct", () => {
    const { state, query } = fixture();
    const first = query.capture({});
    expect(first.sessions.rows[0]?.openedWorkspaces.rows.map(w => w.worktreeId)).toEqual([a.worktreeId, b.worktreeId]);
    expect(first.sessions.rows[0]?.activeWorkspace?.worktreeId).toBe(b.worktreeId);
    expect(first.jobs.rows[0]?.worktreeId).toBe(a.worktreeId);
    state.sessions = [];
    const ended = query.capture({ sessionId: "s" });
    expect(ended.sessions.completeness).toBe("complete");
    expect(ended.sessions.rows).toEqual([]);
    expect(ended.jobs.rows[0]).toMatchObject({ sessionId: "s", worktreeId: a.worktreeId, originatingSession: "not_registered" });
    expect(ended.workspaces.rows.map(w => w.worktreeId)).toEqual([a.worktreeId]);
  });

  it("preserves distinct sessions sharing one workspace and filters by opened membership", () => {
    const { state, query } = fixture();
    state.sessions.push(session("second"));
    const result = query.capture({ workspaceId: a.worktreeId });
    expect(result.sessions.rows.map(s => s.sessionId)).toEqual(["s", "second"]);
    expect(result.workspaces.rows.map(w => w.worktreeId)).toEqual([a.worktreeId]);
    expect(result.sessions.rows[0]?.activeWorkspace?.worktreeId).toBe(b.worktreeId);
    expect(result.sessions.rows[0]?.openedWorkspaces.rows).toHaveLength(1);
  });

  it("filters before the result limit and does not treat omitted matches as absent", () => {
    const { state, query } = fixture();
    state.sessions = [session("first"), session("last")];
    expect(query.capture({ sessionId: "last", limit: 1 }).sessions.rows[0]?.sessionId).toBe("last");
    const bounded = query.capture({ limit: 1 });
    expect(bounded.sessions).toMatchObject({ returned: 1, matchingTotal: 2, completeness: "truncated" });
    expect(bounded.sessions.rows[0]?.openedWorkspaces.completeness).toBe("truncated");
  });

  it("caps query traversal even for a nonmatching source that never ends", () => {
    const { source, query } = fixture();
    let visits = 0;
    source.jobs = function* () { for (;;) { visits++; yield { ...job(), repoId: "other" }; } };
    const result = query.capture({ repoId: "missing" });
    expect(visits).toBeLessThanOrEqual(4096);
    expect(result.jobs).toMatchObject({ rows: [], matchingTotal: null, completeness: "bounded" });
    expect(result.capture.workUnits).toBeLessThanOrEqual(4096);
  });

  it("does not replace failed evidence with a zero or a complete empty list", () => {
    const { source, query } = fixture();
    source.jobs = () => { throw new Error("password=do-not-export"); };
    const result = query.capture({ sessionId: "s" });
    expect(result.jobs).toMatchObject({ availability: "unavailable", matchingTotal: null, completeness: "unknown" });
    expect(result.workspaces.completeness).not.toBe("complete");
    expect(JSON.stringify(result)).not.toContain("do-not-export");
    expect(result.serviceAssessment.availability).toBe("unsupported");
  });

  it("never turns a recent capture into index coverage or current-source validation", () => {
    const { state, query } = fixture();
    const first = query.capture({});
    state.now = "2026-09-07T10:03:00.000Z";
    const second = query.capture({});
    expect(second.capture.observedAt).not.toBe(first.capture.observedAt);
    expect(second.workspaces.rows[0]?.indexEvidence).toEqual(first.workspaces.rows[0]?.indexEvidence);
    expect(second.workspaces.rows[0]?.indexEvidence).toMatchObject({
      availability: "not_retained", entryCount: null, completeness: "unknown",
      sourceObservations: "unknown", basis: null, currentSourceValidation: "unavailable",
    });
    const mixed = structuredClone(second);
    mixed.workspaces.rows[0]!.indexEvidence = { ...mixed.workspaces.rows[0]!.indexEvidence,
      availability: "available", entryCount: 137, countScope: "current_index_entries", sourceObservations: "mixed",
    };
    expect(inspectionObservationSchema.safeParse(mixed).success).toBe(true);
    mixed.workspaces.rows[0]!.indexEvidence.basis = { kind: "git_commit", id: "abc" };
    expect(inspectionObservationSchema.safeParse(mixed).success).toBe(false);
  });

  it("keeps layer counters and their accumulation epoch separate from present service health", () => {
    const { query } = fixture();
    const result = query.capture({});
    expect(result.history).toMatchObject({
      accumulationStartedAt: startedAt, incarnationId: "incarnation:one",
      scheduler: { completed: 4, failed: 2 }, workers: { completed: 4, failed: 2 },
      recentFailures: "not_retained",
    });
    expect(result.serviceAssessment).toMatchObject({ availability: "unsupported" });
    expect(result.history).not.toHaveProperty("totalFailures");
  });

  it("copies values synchronously without retaining mutable owner state", () => {
    const { state, query } = fixture();
    const before = structuredClone({ sessions: state.sessions.map(({ openedWorkspaces: _opened, ...s }) => s), jobs: state.jobs });
    const result = query.capture({});
    for (let n = 0; n < 10; n++) query.capture({});
    expect({ sessions: state.sessions.map(({ openedWorkspaces: _opened, ...s }) => s), jobs: state.jobs }).toEqual(before);
    state.jobs[0] = { ...job(), worktreeId: b.worktreeId };
    expect(result.jobs.rows[0]?.worktreeId).toBe(a.worktreeId);
    expect(result.capture.consistency).toBe("synchronous_parent_state");
    expect(inspectionObservationSchema.safeParse(result).success).toBe(true);
  });

  it("bounds and redacts detail text without changing join identities", () => {
    const { state, query } = fixture();
    state.sessions[0] = { ...session(), reportedClient: { name: "agent\u001b[2J password=secret", version: "x".repeat(10000) } };
    const result = query.capture({});
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("password=secret");
    expect(result.sessions.rows[0]?.reportedClient?.name).not.toContain("\u001b");
    expect(result.sessions.rows[0]?.reportedClient?.version.length).toBeLessThanOrEqual(512);
    expect(result.sessions.rows[0]?.sessionId).toBe("s");
    const hostile = structuredClone(result);
    hostile.sessions.rows[0]!.reportedClient!.name = "agent\u001b]52;c;clipboard\u0007";
    expect(inspectionObservationSchema.safeParse(hostile).success).toBe(false);
    hostile.sessions.rows[0]!.reportedClient!.name = "AWS_SECRET_ACCESS_KEY=do-not-export";
    expect(inspectionObservationSchema.safeParse(hostile).success).toBe(false);
    state.sessions[0] = session("s".repeat(1000));
    expect(query.capture({}).sessions.availability).toBe("unavailable");
  });
});
