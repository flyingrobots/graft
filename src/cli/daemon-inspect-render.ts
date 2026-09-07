import type { InspectionCollection, InspectionResult } from "../contracts/daemon-inspection.js";
import { inspectionText } from "../format/inspection-text.js";

function inventory<T>(label: string, collection: InspectionCollection<T>): string {
  return `${label}: returned ${String(collection.returned)}; matching total ${collection.matchingTotal === null ? "unknown" : String(collection.matchingTotal)}; ${collection.availability}; ${collection.completeness}${collection.reason === null ? "" : ` (${collection.reason})`}`;
}

/** Explicit time input; drawing never calls the daemon or discovers source state. */
export function renderDaemonInspection(result: InspectionResult, now: string): string {
  const safe = inspectionText;
  if (result.status !== "ok") return `Graft daemon inspection: ${result.status}\nClient: ${safe(result.clientVersion)}\nReason: ${safe(result.reason)}`;
  const o = result.observation;
  const ageMs = Date.parse(now) - Date.parse(o.capture.observedAt);
  const age = Number.isFinite(ageMs) && ageMs >= 0 ? `${String(ageMs)}ms` : "unknown (clock disagreement)";
  const lines = [
    "Graft daemon inspection — single capture (no live refresh)",
    `Daemon: PID ${String(o.runtime.pid)}; loaded version ${safe(o.runtime.version)}; client ${safe(result.clientVersion)}; schema ${o.schemaVersion}`,
    `Incarnation: ${safe(o.runtime.incarnationId)}; started ${safe(o.runtime.startedAt)}`,
    `Loaded module: ${safe(o.runtime.modulePath)}`,
    `Executable: ${safe(o.runtime.executablePath)}; socket: ${safe(o.runtime.socketPath)}`,
    `Capture: ${String(o.capture.sequence)} at ${safe(o.capture.observedAt)}; capture age ${age}`,
    "Consistency: synchronous parent state; workers are parent last-known assignments",
    "Capture age does not establish source currency. Current service assessment: unsupported (no current-health rule).",
    `Scope: same-user operator; ${o.scope.filter.sessionId !== undefined ? `session ${safe(o.scope.filter.sessionId)}` : o.scope.filter.workspaceId !== undefined ? `workspace ${safe(o.scope.filter.workspaceId)}` : o.scope.filter.repoId !== undefined ? `repository ${safe(o.scope.filter.repoId)} (aggregates worktrees)` : "daemon"}`,
    "",
    inventory("Jobs (scheduler-owned; not all requests)", o.jobs),
  ];
  for (const j of o.jobs.rows) lines.push(`  ${safe(j.jobId)} ${j.state} ${safe(j.tool)} | session ${safe(j.sessionId ?? "not applicable")} (${j.originatingSession}) | workspace ${safe(j.worktreeId ?? "unavailable")} | repo ${safe(j.repoId)} | queued ${safe(j.enqueuedAt)}; started ${safe(j.startedAt ?? "not started")} | wait reason not exposed; worker correlation not retained`);
  lines.push("", inventory("Sessions (currently registered)", o.sessions));
  for (const s of o.sessions.rows) {
    lines.push(`  ${safe(s.sessionId)} | active ${safe(s.activeWorkspace?.worktreeId ?? "unbound")} | last activity ${safe(s.lastActivityAt)}`);
    lines.push(`    Reported client (unverified): ${s.reportedClient === null ? "not retained" : `${safe(s.reportedClient.name)} ${safe(s.reportedClient.version)}`}`);
    lines.push(`    ${inventory("Currently opened workspaces", s.openedWorkspaces)}`);
    for (const w of s.openedWorkspaces.rows) lines.push(`      ${safe(w.worktreeId)} | ${safe(w.worktreeRoot)} | repo ${safe(w.repoId)}${w.worktreeId === s.activeWorkspace?.worktreeId ? " | active default" : ""}`);
  }
  lines.push("", inventory("Authorized workspace records", o.workspaces));
  for (const w of o.workspaces.rows) {
    const e = w.indexEvidence;
    lines.push(`  ${safe(w.worktreeId)} | ${safe(w.worktreeRoot)} | repo ${safe(w.repoId)} | authorized`);
    lines.push(`    Index evidence: ${e.availability}; entry count ${e.entryCount === null ? "unknown" : String(e.entryCount)}; count scope ${e.countScope ?? "unknown"}; completeness ${e.completeness}`);
    lines.push(`    Source observations: ${e.sourceObservations}; basis ${e.basis === null ? "unknown" : `${e.basis.kind} ${safe(e.basis.id)}`}; current-source validation ${e.currentSourceValidation}`);
    lines.push("    Storage association and workspace residency: not retained");
  }
  lines.push("", inventory("Workers (daemon-wide, parent last-known)", o.workers));
  for (const w of o.workers.rows) lines.push(`  ${safe(w.workerId)} | PID ${String(w.pid ?? "unavailable")} | ${w.state} | worker request ${safe(w.requestId ?? "none")} | session ${safe(w.sessionId ?? "unavailable")} | workspace ${safe(w.worktreeId ?? "unavailable")}`);
  lines.push("", inventory("Repository monitors", o.monitors));
  for (const m of o.monitors.rows) lines.push(`  ${safe(m.repoId)} | ${m.lifecycleState} | recorded health ${m.recordedHealth} | last tick ${safe(m.lastTickAt ?? "not recorded")} | last indexed commit ${safe(m.lastIndexedCommit ?? "not recorded")} | source currency not validated`);
  lines.push("", `Daemon-wide WARP pool repository keys (including pending opens): ${o.pool === null ? "unavailable" : String(o.pool.repositoryKeys)}; not workspace coverage or index residency`,
    `Daemon-wide historical outcomes accumulated since ${safe(o.history.accumulationStartedAt)} in incarnation ${safe(o.history.incarnationId)}:`);
  for (const [layer, counts] of [["Scheduler jobs", o.history.scheduler], ["Worker tasks", o.history.workers]] as const) lines.push(`  ${layer}: ${counts === null ? "unavailable" : `${String(counts.completed)} completed; ${String(counts.failed)} failed`}`);
  lines.push("Layer counters are not summed or correlated. Recent failures: not retained.", "Missing rows in partial inventories do not establish absence.");
  return lines.join("\n");
}
