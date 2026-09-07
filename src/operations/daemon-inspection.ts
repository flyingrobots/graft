import {
  INSPECTION_LIMITS, INSPECTION_SCHEMA_VERSION, inspectionRequestSchema,
  type InspectionCollection, type InspectionObservation, type InspectionRequest,
  type InspectionRuntime, type InspectionSessionRow, type InspectionWorkspaceIdentity,
  type InspectionWorkspaceRow, type InspectionJobRow,
} from "../contracts/daemon-inspection.js";
import type { InspectionSource } from "../ports/daemon-inspection.js";
import { inspectionIdentity, inspectionText } from "../format/inspection-text.js";

export interface DaemonInspectionQueryOptions {
  readonly source: InspectionSource; readonly runtime: InspectionRuntime; readonly now: () => string;
}

function empty<T>(): InspectionCollection<T> {
  return { availability: "available", completeness: "complete", returned: 0, matchingTotal: 0, reason: null, rows: [] };
}
function unavailable<T>(): InspectionCollection<T> {
  return { availability: "unavailable", completeness: "unknown", returned: 0, matchingTotal: null, reason: "PROJECTION_UNAVAILABLE", rows: [] };
}
function incomplete<T>(collection: InspectionCollection<T>): void {
  if (collection.availability === "unavailable") return;
  collection.completeness = "bounded";
  collection.matchingTotal = null;
  collection.reason = "SCOPE_OR_SCAN_INCOMPLETE";
}

class CaptureBudget {
  workUnits = 0;
  rows = 0;
  constructor(readonly limit: number) {}

  collect<T, R>(source: () => Iterable<T | null>, project: (value: T) => R | null): InspectionCollection<R> {
    const result = empty<R>();
    try {
      const iterator = source()[Symbol.iterator]();
      for (;;) {
        if (this.workUnits >= INSPECTION_LIMITS.workUnits) {
          incomplete(result);
          break;
        }
        this.workUnits++;
        const next = iterator.next();
        if (next.done === true) break;
        if (next.value === null) continue;
        const row = project(next.value);
        if (row === null) continue;
        result.matchingTotal = (result.matchingTotal ?? 0) + 1;
        if (result.rows.length < this.limit && this.rows < INSPECTION_LIMITS.totalRows) {
          result.rows.push(row);
          this.rows++;
        } else {
          result.completeness = "truncated";
          result.reason = "RESULT_LIMIT";
        }
      }
      result.returned = result.rows.length;
      return result;
    } catch {
      return unavailable<R>();
    }
  }
}

function identity(workspace: InspectionWorkspaceIdentity): InspectionWorkspaceIdentity {
  return { repoId: inspectionIdentity(workspace.repoId), worktreeId: inspectionIdentity(workspace.worktreeId), worktreeRoot: inspectionText(workspace.worktreeRoot) };
}
function nullableId(value: string | null): string | null {
  return value === null ? null : inspectionIdentity(value);
}

/** One synchronous capture on the daemon event loop. No await, graph handle,
 * filesystem, scheduler command, lease API, or workload-context capture here. */
export class DaemonInspectionQuery {
  private sequence = 0;
  private readonly runtime: InspectionRuntime;
  constructor(private readonly options: DaemonInspectionQueryOptions) {
    this.runtime = { ...options.runtime,
      incarnationId: inspectionIdentity(options.runtime.incarnationId),
      version: inspectionText(options.runtime.version), modulePath: inspectionText(options.runtime.modulePath),
      executablePath: inspectionText(options.runtime.executablePath), socketPath: inspectionText(options.runtime.socketPath),
    };
  }

  capture(input: InspectionRequest): InspectionObservation {
    const filter = inspectionRequestSchema.parse(input);
    const budget = new CaptureBudget(filter.limit ?? INSPECTION_LIMITS.rows);
    const source = this.options.source;
    const observedAt = this.options.now();
    const relatedWorkspaces = new Set<string>();
    const scope = { complete: true };
    const matchesWorkspace = (w: { repoId: string; worktreeId: string | null }) => {
      return (filter.repoId === undefined || w.repoId === filter.repoId)
        && (filter.workspaceId === undefined || w.worktreeId === filter.workspaceId);
    };

    const sessions = budget.collect(() => source.sessions(filter.sessionId), (s): InspectionSessionRow | null => {
      if (filter.sessionId !== undefined && s.sessionId !== filter.sessionId) return null;
      const membership = { matched: false };
      const openedWorkspaces = budget.collect(() => s.openedWorkspaces(), (w) => {
        if (!matchesWorkspace(w)) return null;
        membership.matched = true;
        relatedWorkspaces.add(w.worktreeId);
        return { ...identity(w), openedAt: w.openedAt, lastActivatedAt: w.lastActivatedAt };
      });
      if (openedWorkspaces.completeness === "bounded" || openedWorkspaces.availability === "unavailable") scope.complete = false;
      if ((filter.repoId !== undefined || filter.workspaceId !== undefined) && !membership.matched) return null;
      return {
        sessionId: inspectionIdentity(s.sessionId), startedAt: s.startedAt, lastActivityAt: s.lastActivityAt,
        activeWorkspace: s.activeWorkspace === null ? null : identity(s.activeWorkspace),
        reportedClient: s.reportedClient === null ? null : {
          name: inspectionText(s.reportedClient.name), version: inspectionText(s.reportedClient.version), verification: "client_reported",
        },
        reportedClientAvailability: s.reportedClient === null ? "not_retained" : "available", openedWorkspaces,
      };
    });
    if (!scope.complete || sessions.availability === "unavailable") incomplete(sessions);

    const jobs = budget.collect(() => source.jobs(), (j): InspectionJobRow | null => {
      if (!matchesWorkspace(j) || (filter.sessionId !== undefined && j.sessionId !== filter.sessionId)) return null;
      if (j.worktreeId !== null) relatedWorkspaces.add(j.worktreeId);
      let originatingSession: InspectionJobRow["originatingSession"] = "not_applicable";
      if (j.sessionId !== null) {
        try { originatingSession = source.hasSession(j.sessionId) ? "registered" : "not_registered"; }
        catch { originatingSession = "unavailable"; }
      }
      return {
        jobId: inspectionIdentity(j.jobId), sessionId: nullableId(j.sessionId), repoId: inspectionIdentity(j.repoId), worktreeId: nullableId(j.worktreeId),
        sliceId: nullableId(j.sliceId), writerId: inspectionIdentity(j.writerId), tool: inspectionText(j.tool),
        kind: j.kind, priority: j.priority, state: j.state, enqueuedAt: j.enqueuedAt, startedAt: j.startedAt,
        originatingSession, waitReason: "not_exposed", workerCorrelation: "not_retained",
      };
    });

    const workspaces = budget.collect(() => source.workspaces(), (w): InspectionWorkspaceRow | null => {
      if (!matchesWorkspace(w) || (filter.sessionId !== undefined && !relatedWorkspaces.has(w.worktreeId))) return null;
      return { ...identity(w), authorizedAt: w.authorizedAt, authorization: "authorized",
        indexEvidence: { availability: "not_retained", entryCount: null, countScope: null, completeness: "unknown", sourceObservations: "unknown", basis: null, currentSourceValidation: "unavailable" },
        storageAssociation: "not_retained", residency: "not_retained",
      };
    });
    if (filter.sessionId !== undefined && (!scope.complete || sessions.completeness === "bounded" || sessions.availability === "unavailable" || jobs.completeness === "bounded" || jobs.availability === "unavailable")) incomplete(workspaces);

    const workers = budget.collect(() => source.workers(), w => ({
      workerId: inspectionIdentity(w.workerId), pid: w.pid, requestId: nullableId(w.requestId), state: w.state,
      sessionId: nullableId(w.sessionId), repoId: nullableId(w.repoId), worktreeId: nullableId(w.worktreeId),
    }));
    const monitors = budget.collect(() => source.monitors(), m => {
      if (filter.sessionId !== undefined || filter.workspaceId !== undefined) return null;
      if (filter.repoId !== undefined && m.repoId !== filter.repoId) return null;
      return { repoId: inspectionIdentity(m.repoId), anchorWorktreeRoot: inspectionText(m.anchorWorktreeRoot), lifecycleState: m.lifecycleState,
        recordedHealth: m.recordedHealth, lastTickAt: m.lastTickAt, lastSuccessAt: m.lastSuccessAt,
        lastIndexedCommit: nullableId(m.lastIndexedCommit), lastHeadCommit: nullableId(m.lastHeadCommit), backlogCommits: m.backlogCommits,
        sourceCurrency: "not_validated" as const, errorDetail: "not_exported" as const,
      };
    });
    if (filter.sessionId !== undefined || filter.workspaceId !== undefined) {
      Object.assign(monitors, unavailable(), { reason: "REPO_MONITOR_SCOPE_NOT_RESOLVED" });
    }
    let counters: ReturnType<InspectionSource["counters"]> | null = null;
    let pool: InspectionObservation["pool"] = null;
    try { counters = source.counters(); } catch { /* Explicit unavailable counters. */ }
    try { pool = { repositoryKeys: source.pool().repositoryKeys, meaning: "pool_keys_including_pending_opens", workspaceAssociations: "not_retained" }; } catch { /* Never open a graph to recover this gauge. */ }
    this.sequence++;
    return {
      schemaId: "graft.daemon.inspection", schemaVersion: INSPECTION_SCHEMA_VERSION,
      runtime: { ...this.runtime },
      capture: { sequence: this.sequence, observedAt, consistency: "synchronous_parent_state", componentGenerations: "not_retained", workUnits: budget.workUnits, workerEvidence: "parent_last_known_assignments" },
      scope: { authority: "same_user_operator", filter, jobs: "scheduler_jobs_only", workers: "daemon_wide", pool: "daemon_wide", history: "daemon_lifetime_all_workspaces" },
      sessions, workspaces, jobs, workers, monitors, pool,
      history: { incarnationId: this.runtime.incarnationId, accumulationStartedAt: this.runtime.startedAt,
        scheduler: counters === null ? null : { ...counters.scheduler }, workers: counters === null ? null : { ...counters.workers }, recentFailures: "not_retained" },
      serviceAssessment: { availability: "unsupported", reason: "NO_CURRENT_HEALTH_RULE" },
    };
  }
}
