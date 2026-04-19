import type { ToolDefinition } from "./context.js";

import { safeReadTool } from "./tools/safe-read.js";
import { fileOutlineTool } from "./tools/file-outline.js";
import { readRangeTool } from "./tools/read-range.js";
import { changedSinceTool } from "./tools/changed-since.js";
import { graftDiffTool } from "./tools/graft-diff.js";
import { runCaptureTool } from "./tools/run-capture.js";
import { stateSaveTool, stateLoadTool } from "./tools/state.js";
import { doctorTool } from "./tools/doctor.js";
import { statsTool } from "./tools/stats.js";
import { explainTool } from "./tools/explain.js";
import { setBudgetTool } from "./tools/budget.js";
import { sinceTool } from "./tools/since.js";
import { mapTool } from "./tools/map.js";
import { codeShowTool } from "./tools/code-show.js";
import { codeFindTool } from "./tools/code-find.js";
import { codeRefsTool } from "./tools/code-refs.js";
import { structuralChurnTool } from "./tools/structural-churn.js";
import { exportSurfaceDiffTool } from "./tools/export-surface-diff.js";
import { structuralLogTool } from "./tools/structural-log.js";
import { structuralBlameTool } from "./tools/structural-blame.js";
import { structuralReviewTool } from "./tools/structural-review.js";
import { daemonMonitorsTool } from "./tools/daemon-monitors.js";
import { daemonReposTool } from "./tools/daemon-repos.js";
import { daemonSessionsTool } from "./tools/daemon-sessions.js";
import { daemonStatusTool } from "./tools/daemon-status.js";
import { monitorPauseTool } from "./tools/monitor-pause.js";
import { monitorResumeTool } from "./tools/monitor-resume.js";
import { monitorStartTool } from "./tools/monitor-start.js";
import { monitorStopTool } from "./tools/monitor-stop.js";
import { activityViewTool } from "./tools/activity-view.js";
import { causalStatusTool } from "./tools/causal-status.js";
import { causalAttachTool } from "./tools/causal-attach.js";
import { workspaceAuthorizeTool } from "./tools/workspace-authorize.js";
import { workspaceAuthorizationsTool } from "./tools/workspace-authorizations.js";
import { workspaceBindTool } from "./tools/workspace-bind.js";
import { workspaceRevokeTool } from "./tools/workspace-revoke.js";
import { workspaceStatusTool } from "./tools/workspace-status.js";
import { workspaceRebindTool } from "./tools/workspace-rebind.js";

export const TOOL_REGISTRY: readonly ToolDefinition[] = [
  safeReadTool,
  fileOutlineTool,
  readRangeTool,
  changedSinceTool,
  graftDiffTool,
  runCaptureTool,
  stateSaveTool,
  stateLoadTool,
  doctorTool,
  activityViewTool,
  causalStatusTool,
  causalAttachTool,
  statsTool,
  explainTool,
  setBudgetTool,
  sinceTool,
  mapTool,
  codeShowTool,
  codeFindTool,
  codeRefsTool,
  structuralChurnTool,
  exportSurfaceDiffTool,
  structuralLogTool,
  structuralBlameTool,
  structuralReviewTool,
];

export const DAEMON_TOOL_REGISTRY: readonly ToolDefinition[] = [
  daemonReposTool,
  daemonStatusTool,
  daemonSessionsTool,
  daemonMonitorsTool,
  monitorStartTool,
  monitorPauseTool,
  monitorResumeTool,
  monitorStopTool,
  workspaceAuthorizeTool,
  workspaceAuthorizationsTool,
  workspaceRevokeTool,
  workspaceBindTool,
  workspaceStatusTool,
  workspaceRebindTool,
];

export const ALL_TOOL_REGISTRY: readonly ToolDefinition[] = [
  ...TOOL_REGISTRY,
  ...DAEMON_TOOL_REGISTRY,
];
