import { headerBox, table } from "@flyingrobots/bijou";
import { initDefaultContext } from "@flyingrobots/bijou-node";
import type { DaemonStatusModel, UnknownCount } from "./daemon-status-model.js";

function count(value: UnknownCount): string {
  return typeof value === "number" ? String(value) : value;
}

function currentAuthLabel(value: DaemonStatusModel["workspaces"]["current"]["authorization"]): string {
  if (value === "authorized") return "ok";
  if (value === "not_authorized") return "none";
  return "unknown";
}

export function renderDaemonStatus(model: DaemonStatusModel): string {
  const ctx = initDefaultContext();
  const rows = [
    [
      "runtime",
      [
        `transport ${model.daemon.transport}`,
        `started ${model.daemon.startedAt}`,
        `warp repos ${String(model.daemon.activeWarpRepos)}`,
      ].join("; "),
    ],
    [
      "sessions",
      [
        `total ${String(model.sessions.total)}`,
        `bound ${String(model.sessions.bound)}`,
        `unbound ${String(model.sessions.unbound)}`,
        `listed ${count(model.sessions.listed)}`,
      ].join("; "),
    ],
    [
      "workspaces",
      [
        `auth ${String(model.workspaces.authorized)}`,
        `repos ${String(model.workspaces.authorizedRepos)}`,
        `bound ${count(model.workspaces.bound)}`,
        `current ${currentAuthLabel(model.workspaces.current.authorization)}`,
        `status-session ${model.workspaces.current.bindState}`,
        `active ${model.workspaces.current.activeSessions === null ? "unknown" : String(model.workspaces.current.activeSessions)}`,
      ].join("; "),
    ],
    [
      "monitors",
      [
        `total ${String(model.monitors.total)}`,
        `running ${String(model.monitors.running)}`,
        `paused ${String(model.monitors.paused)}`,
        `stopped ${String(model.monitors.stopped)}`,
        `failing ${String(model.monitors.failing)}`,
        `backlog ${String(model.monitors.backlog)}`,
        `listed ${count(model.monitors.listed)}`,
      ].join("; "),
    ],
    [
      "scheduler",
      [
        model.scheduler.pressure,
        `active ${String(model.scheduler.activeJobs)}/${String(model.scheduler.maxConcurrentJobs)}`,
        `queued ${String(model.scheduler.queuedJobs)}`,
        `interactive ${String(model.scheduler.interactiveQueuedJobs)}`,
        `background ${String(model.scheduler.backgroundQueuedJobs)}`,
        `longest wait ${String(model.scheduler.longestQueuedWaitMs)}ms`,
      ].join("; "),
    ],
    [
      "workers",
      [
        model.workers.pressure,
        model.workers.mode,
        `busy ${String(model.workers.busyWorkers)}/${String(model.workers.totalWorkers)}`,
        `idle ${String(model.workers.idleWorkers)}`,
        `queued ${String(model.workers.queuedTasks)}`,
      ].join("; "),
    ],
  ];

  return [
    headerBox("Daemon Status", {
      detail: `health: ${model.daemon.health}`,
      width: 80,
      ctx,
    }),
    `cwd: ${model.cwd}`,
    `socket: ${model.daemon.socketPath}`,
    `mcp: ${model.daemon.mcpPath}`,
    "",
    table({
      ctx,
      columns: [
        { header: "Surface" },
        { header: "State" },
      ],
      rows,
    }),
    "",
    `degraded: ${model.degraded.length === 0 ? "none" : model.degraded.join(", ")}`,
  ].join("\n").trimEnd();
}
