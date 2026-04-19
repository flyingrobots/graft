import { z } from "zod";
import type { GovernorTrackerSnapshot } from "../session/tracker.js";
import type { McpToolReceipt, McpToolResult } from "./receipt.js";
import type { ToolDefinition, ToolHandler } from "./context.js";
import type { MetricsDelta, MetricsSnapshot } from "./metrics.js";
import type { ObservationSnapshot } from "./cache.js";
import type { RepoObservation } from "./repo-state.js";
import type { WorkspaceCapabilityProfile } from "./workspace-router.js";
import { graftDiffTool } from "./tools/graft-diff.js";
import { sinceTool } from "./tools/since.js";
import { mapTool } from "./tools/map.js";
import { codeRefsTool } from "./tools/code-refs.js";
import { codeFindTool, runCodeFind } from "./tools/code-find.js";
import { codeShowTool, runCodeShow } from "./tools/code-show.js";
import { safeReadTool } from "./tools/safe-read.js";
import { fileOutlineTool } from "./tools/file-outline.js";
import { changedSinceTool } from "./tools/changed-since.js";
import { buildRepoToolWorkerContext, wrapWithPolicyCheck } from "./repo-tool-worker-context.js";

const codeFindLiveWorkerTool: ToolDefinition = {
  ...codeFindTool,
  createHandler(): ToolHandler {
    return (args, ctx) => runCodeFind(ctx, args, { allowWarp: false });
  },
};

const codeShowLiveWorkerTool: ToolDefinition = {
  ...codeShowTool,
  createHandler(): ToolHandler {
    return (args, ctx) => runCodeShow(ctx, args, { allowWarp: false });
  },
};

const OFFLOADED_REPO_TOOL_DEFINITIONS = Object.freeze({
  safe_read: safeReadTool,
  file_outline: fileOutlineTool,
  changed_since: changedSinceTool,
  graft_diff: graftDiffTool,
  graft_since: sinceTool,
  graft_map: mapTool,
  code_refs: codeRefsTool,
  code_find_live: codeFindLiveWorkerTool,
  code_show_live: codeShowLiveWorkerTool,
});

export type OffloadedRepoToolName = keyof typeof OFFLOADED_REPO_TOOL_DEFINITIONS;

export const OFFLOADED_DAEMON_REPO_TOOL_NAMES = Object.freeze(
  Object.keys(OFFLOADED_REPO_TOOL_DEFINITIONS) as OffloadedRepoToolName[],
);

export interface RepoToolWorkerJob {
  readonly sessionId: string;
  readonly workspaceSliceId: string;
  readonly traceId: string;
  readonly seq: number;
  readonly startedAtMs: number;
  readonly tool: OffloadedRepoToolName;
  readonly args: Record<string, unknown>;
  readonly projectRoot: string;
  readonly graftDir: string;
  readonly graftignorePatterns: readonly string[];
  readonly repoId: string;
  readonly worktreeId: string;
  readonly gitCommonDir: string;
  readonly writerId: string;
  readonly capabilityProfile: WorkspaceCapabilityProfile;
  readonly repoState: RepoObservation;
  readonly governorSnapshot: GovernorTrackerSnapshot;
  readonly metricsSnapshot: MetricsSnapshot;
  readonly cacheSnapshots?: Readonly<Record<string, ObservationSnapshot>>;
}

export interface RepoToolWorkerResult {
  readonly result: McpToolResult;
  readonly textBytes: number;
  readonly receipt: McpToolReceipt;
  readonly tripwireSignals: readonly string[];
  readonly metricsDelta: MetricsDelta;
  readonly cacheUpdates: readonly {
    path: string;
    observation: ObservationSnapshot | null;
  }[];
}

function resolveRepoToolDefinition(tool: OffloadedRepoToolName): ToolDefinition {
  return OFFLOADED_REPO_TOOL_DEFINITIONS[tool];
}

export async function runRepoToolJob(job: RepoToolWorkerJob): Promise<RepoToolWorkerResult> {
  const definition = resolveRepoToolDefinition(job.tool);
  const { ctx, takeResponse } = buildRepoToolWorkerContext(job);
  const rawHandler = definition.createHandler();
  const handler = definition.policyCheck === true ? wrapWithPolicyCheck(definition.name, rawHandler) : rawHandler;

  if (definition.schema !== undefined) {
    z.object(definition.schema).strict().parse(job.args);
  }

  await handler(job.args, ctx);
  return takeResponse();
}
