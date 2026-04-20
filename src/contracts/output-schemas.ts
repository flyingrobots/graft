import { z } from "zod";
import {
  CLI_COMMAND_NAMES,
  type CliCommandName,
  CLI_COMMAND_TO_MCP_TOOL,
  MCP_TOOL_NAMES,
  type McpToolName,
} from "./capabilities.js";
import {
  attributionSummarySchema,
  attributionConfidenceSchema,
  evidenceSchema,
  readEventSchema,
  localHistoryContinuityOperationSchema,
  repoConcurrencyAuthoritySchema,
  repoConcurrencyPostureSchema,
  stageEventSchema,
  transitionEventSchema,
  stagedTargetSchema,
} from "./causal-ontology.js";
import { causalSurfaceNextActionSchema } from "./causal-surface-next-action.js";

export { CLI_COMMAND_NAMES, MCP_TOOL_NAMES };
export type { CliCommandName, McpToolName } from "./capabilities.js";

export const OUTPUT_SCHEMA_VERSION = "1.0.0" as const;

export interface OutputSchemaMeta {
  readonly id: string;
  readonly version: typeof OUTPUT_SCHEMA_VERSION;
}

const mcpOutputSchemaMeta = Object.freeze(Object.fromEntries(
  MCP_TOOL_NAMES.map((tool) => [tool, Object.freeze({
    id: `graft.mcp.${tool}`,
    version: OUTPUT_SCHEMA_VERSION,
  })]),
) as Record<McpToolName, OutputSchemaMeta>);

const cliOutputSchemaMeta = Object.freeze(Object.fromEntries(
  CLI_COMMAND_NAMES.map((command) => [command, Object.freeze({
    id: `graft.cli.${command}`,
    version: OUTPUT_SCHEMA_VERSION,
  })]),
) as Record<CliCommandName, OutputSchemaMeta>);

function schemaMetaLiteral(meta: OutputSchemaMeta) {
  return z.object({
    id: z.literal(meta.id),
    version: z.literal(meta.version),
  }).strict();
}

const sessionDepthSchema = z.enum(["early", "mid", "late", "unknown"]);
const worldlineLayerSchema = z.enum(["commit_worldline", "ref_view", "workspace_overlay"]);
const repoTransitionKindSchema = z.enum(["checkout", "reset", "merge", "rebase"]);

const actualSchema = z.object({
  lines: z.number().int().nonnegative(),
  bytes: z.number().int().nonnegative(),
}).strict();

const thresholdsSchema = z.object({
  lines: z.number().int().nonnegative(),
  bytes: z.number().int().nonnegative(),
}).strict();

const budgetSchema = z.object({
  total: z.number().int().positive(),
  consumed: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  fraction: z.number(),
}).strict();

const tripwireSchema = z.object({
  _brand: z.literal("Tripwire").optional(),
  signal: z.string(),
  recommendation: z.string(),
}).strict();

const outlineEntrySchema: z.ZodType = z.lazy(() => z.object({
  _brand: z.literal("OutlineEntry").optional(),
  kind: z.string(),
  name: z.string(),
  signature: z.string().optional(),
  exported: z.boolean(),
  children: z.array(outlineEntrySchema).optional(),
}).strict());

const jumpEntrySchema = z.object({
  _brand: z.literal("JumpEntry").optional(),
  symbol: z.string(),
  kind: z.string(),
  start: z.number().int().positive(),
  end: z.number().int().positive(),
}).strict();

const diffContinuitySchema = z.object({
  _brand: z.literal("DiffContinuity").optional(),
  kind: z.enum(["rename"]),
  confidence: z.enum(["likely"]),
  basis: z.enum(["matching_signature_shape", "matching_child_structure"]),
  symbolKind: z.string(),
  oldName: z.string(),
  newName: z.string(),
  oldSignature: z.string().optional(),
  newSignature: z.string().optional(),
}).strict();

const outlineDiffSchema: z.ZodType = z.lazy(() => z.object({
  _brand: z.literal("OutlineDiff").optional(),
  added: z.array(diffEntrySchema),
  removed: z.array(diffEntrySchema),
  changed: z.array(diffEntrySchema),
  continuity: z.array(diffContinuitySchema),
  unchangedCount: z.number().int().nonnegative(),
}).strict());

const diffEntrySchema: z.ZodType = z.lazy(() => z.object({
  _brand: z.literal("DiffEntry").optional(),
  name: z.string(),
  kind: z.string(),
  exported: z.boolean().optional(),
  signature: z.string().optional(),
  oldSignature: z.string().optional(),
  childDiff: outlineDiffSchema.optional(),
  identityId: z.string().optional(),
}).strict());

const burdenKindSchema = z.enum(["read", "search", "shell", "state", "diagnostic"]);

const burdenBucketSchema = z.object({
  calls: z.number().int().nonnegative(),
  bytesReturned: z.number().int().nonnegative(),
}).strict();

const burdenByKindSchema = z.object({
  read: burdenBucketSchema,
  search: burdenBucketSchema,
  shell: burdenBucketSchema,
  state: burdenBucketSchema,
  diagnostic: burdenBucketSchema,
}).strict();

const receiptSchema = z.object({
  sessionId: z.string(),
  traceId: z.string(),
  seq: z.number().int().positive(),
  ts: z.string(),
  tool: z.string(),
  projection: z.string(),
  reason: z.string(),
  latencyMs: z.number().int().nonnegative(),
  fileBytes: z.number().int().nonnegative().nullable(),
  returnedBytes: z.number().int().nonnegative(),
  burden: z.object({
    kind: burdenKindSchema,
    nonRead: z.boolean(),
  }).strict(),
  cumulative: z.object({
    reads: z.number().int().nonnegative(),
    outlines: z.number().int().nonnegative(),
    refusals: z.number().int().nonnegative(),
    cacheHits: z.number().int().nonnegative(),
    bytesReturned: z.number().int().nonnegative(),
    bytesAvoided: z.number().int().nonnegative(),
    nonReadBytesReturned: z.number().int().nonnegative(),
    burdenByKind: burdenByKindSchema,
  }).strict(),
  budget: budgetSchema.optional(),
  compressionRatio: z.number().nullable().optional(),
}).strict();

const runtimeObservabilitySchema = z.object({
  enabled: z.boolean(),
  logPath: z.string(),
  maxBytes: z.number().int().positive(),
  logPolicy: z.literal("metadata_only"),
}).strict();

const runtimeCausalContextSchema = z.object({
  transportSessionId: z.string(),
  workspaceSliceId: z.string(),
  causalSessionId: z.string(),
  strandId: z.string(),
  checkoutEpochId: z.string(),
  warpWriterId: z.string(),
  stability: z.literal("runtime_local"),
  provenanceLevel: z.literal("artifact_history"),
}).strict();

const runtimeLocalProvenanceSchema = z.object({
  stability: z.literal("runtime_local"),
  provenanceLevel: z.literal("artifact_history"),
}).strict();

const runtimeStagedTargetSchema = z.discriminatedUnion("availability", [
  runtimeLocalProvenanceSchema.extend({
    availability: z.literal("none"),
  }).strict(),
  runtimeLocalProvenanceSchema.extend({
    availability: z.literal("full_file"),
    attribution: attributionSummarySchema,
    target: stagedTargetSchema.safeExtend({
      selectionKind: z.literal("full_file"),
    }),
  }).strict(),
  runtimeLocalProvenanceSchema.extend({
    availability: z.literal("ambiguous"),
    attribution: attributionSummarySchema,
    reason: z.enum([
      "missing_head_commit",
      "missing_workspace_overlay",
      "modified_path_selection_requires_deeper_evidence",
    ]),
    observedStagedPaths: z.number().int().positive(),
    ambiguousPaths: z.array(z.string()).min(1),
  }).strict(),
]);

const activityViewAnchorSchema = z.discriminatedUnion("posture", [
  z.object({
    posture: z.literal("head_commit"),
    headRef: z.string().nullable(),
    headSha: z.string(),
  }).strict(),
  z.object({
    posture: z.literal("unknown"),
    headRef: z.string().nullable(),
    headSha: z.string().nullable(),
    reason: z.enum(["workspace_unbound", "missing_head_commit"]),
  }).strict(),
]);

const activityViewContinuityItemSchema = z.object({
  itemKind: z.literal("continuity"),
  recordId: z.string(),
  operation: localHistoryContinuityOperationSchema,
  occurredAt: z.string(),
  causalSessionId: z.string(),
  strandId: z.string(),
  attribution: attributionSummarySchema,
  continuedFromCausalSessionId: z.string().nullable(),
  continuedFromStrandId: z.string().nullable(),
}).strict();

const activityViewItemSchema = z.union([
  activityViewContinuityItemSchema,
  readEventSchema,
  stageEventSchema,
  transitionEventSchema,
]);

const activityViewGroupSchema = z.object({
  groupKind: z.enum(["transition", "stage", "continuity", "read"]),
  label: z.string(),
  summary: z.string(),
  count: z.number().int().positive(),
  items: z.array(activityViewItemSchema),
}).strict();

const activityViewSummarySchema = z.object({
  headline: z.string(),
  anchor: z.string(),
  workspace: z.string(),
  groups: z.array(z.string()),
}).strict();

const persistedLocalHistorySummarySchema = z.discriminatedUnion("availability", [
  z.object({
    availability: z.literal("none"),
    persistence: z.literal("persisted_local_history"),
    historyPath: z.string().nullable(),
    totalContinuityRecords: z.literal(0),
    active: z.literal(false),
    lastOperation: z.null(),
    lastObservedAt: z.null(),
    continuityKey: z.null(),
    causalSessionId: z.null(),
    strandId: z.null(),
    checkoutEpochId: z.null(),
    continuedFromCausalSessionId: z.null(),
    continuityConfidence: attributionConfidenceSchema,
    continuityEvidence: z.array(evidenceSchema),
    attribution: attributionSummarySchema,
    latestReadEvent: z.null(),
    latestStageEvent: z.null(),
    latestTransitionEvent: z.null(),
    preserves: z.array(z.string()),
    excludes: z.array(z.string()),
    nextAction: z.literal("bind_workspace_to_begin_local_history"),
  }).strict(),
  z.object({
    availability: z.literal("present"),
    persistence: z.literal("persisted_local_history"),
    historyPath: z.string().nullable(),
    totalContinuityRecords: z.number().int().positive(),
    active: z.boolean(),
    lastOperation: localHistoryContinuityOperationSchema,
    lastObservedAt: z.string(),
    continuityKey: z.string(),
    causalSessionId: z.string(),
    strandId: z.string(),
    checkoutEpochId: z.string(),
    continuedFromCausalSessionId: z.string().nullable(),
    continuityConfidence: attributionConfidenceSchema,
    continuityEvidence: z.array(evidenceSchema),
    attribution: attributionSummarySchema,
    latestReadEvent: readEventSchema.nullable(),
    latestStageEvent: stageEventSchema.nullable(),
    latestTransitionEvent: transitionEventSchema.nullable(),
    preserves: z.array(z.string()),
    excludes: z.array(z.string()),
    nextAction: z.enum([
      "continue_active_causal_workspace",
      "review_transition_boundary_before_continuing",
      "inspect_or_resume_local_history",
    ]),
  }).strict(),
]);

const repoConcurrencySummarySchema = z.object({
  posture: repoConcurrencyPostureSchema,
  authority: repoConcurrencyAuthoritySchema,
  observedWorktreeCount: z.number().int().positive(),
  observedCausalSessionCount: z.number().int().nonnegative(),
  observedActorCount: z.number().int().nonnegative(),
  overlappingPathCount: z.number().int().nonnegative(),
  summary: z.string().min(1),
  daemonSessionLiveness: z.object({
    idleTimeoutMs: z.number().int().positive(),
    liveSessionCount: z.number().int().nonnegative(),
    staleSessionCount: z.number().int().nonnegative(),
  }).strict().optional(),
}).strict();

const precisionSymbolMatchSchema = z.object({
  name: z.string(),
  kind: z.string(),
  path: z.string(),
  signature: z.string().optional(),
  exported: z.boolean(),
  startLine: z.number().int().positive().optional(),
  endLine: z.number().int().positive().optional(),
}).strict();

const codeRefsMatchSchema = z.object({
  path: z.string(),
  line: z.number().int().positive(),
  column: z.number().int().positive().optional(),
  preview: z.string(),
}).strict();

const codeRefsProvenanceSchema = z.object({
  engine: z.enum(["ripgrep", "grep"]),
  pattern: z.string(),
  approximate: z.literal(true),
  filesSearched: z.number().int().nonnegative(),
}).strict();

const structuralRefusalSchema = z.object({
  path: z.string(),
  reason: z.string(),
  reasonDetail: z.string(),
  next: z.array(z.string()),
  actual: actualSchema,
}).strict();

const mapFileSchema = z.object({
  path: z.string(),
  lang: z.string(),
  symbols: z.array(z.object({
    name: z.string(),
    kind: z.string(),
    signature: z.string().optional(),
    exported: z.boolean(),
    startLine: z.number().int().positive().optional(),
    endLine: z.number().int().positive().optional(),
  }).strict()),
}).strict();

const fileDiffSchema = z.object({
  path: z.string(),
  status: z.enum(["modified", "added", "deleted"]),
  summary: z.string(),
  diff: outlineDiffSchema,
}).strict();

const repoTransitionSchema = z.object({
  kind: repoTransitionKindSchema,
  fromRef: z.string().nullable(),
  toRef: z.string().nullable(),
  fromCommit: z.string().nullable(),
  toCommit: z.string().nullable(),
  evidence: z.object({
    reflogSubject: z.string().nullable(),
  }).strict(),
}).strict();

const repoSemanticTransitionSchema = z.object({
  kind: z.enum([
    "index_update",
    "conflict_resolution",
    "merge_phase",
    "rebase_phase",
    "bulk_transition",
    "unknown",
  ]),
  authority: z.enum([
    "authoritative_git_state",
    "repo_snapshot",
  ]),
  phase: z.enum([
    "started",
    "conflicted",
    "resolved_waiting_commit",
    "continued",
    "completed_or_cleared",
  ]).nullable(),
  summary: z.string(),
  evidence: z.object({
    totalPaths: z.number().int().nonnegative(),
    stagedPaths: z.number().int().nonnegative(),
    changedPaths: z.number().int().nonnegative(),
    untrackedPaths: z.number().int().nonnegative(),
    unmergedPaths: z.number().int().nonnegative(),
    mergeInProgress: z.boolean(),
    rebaseInProgress: z.boolean(),
    rebaseStep: z.number().int().positive().nullable(),
    rebaseTotalSteps: z.number().int().positive().nullable(),
    lastTransitionKind: repoTransitionKindSchema.nullable(),
    reflogSubject: z.string().nullable(),
  }).strict(),
}).strict();

const workspaceOverlaySummarySchema = z.object({
  dirty: z.literal(true),
  totalPaths: z.number().int().nonnegative(),
  stagedPaths: z.number().int().nonnegative(),
  changedPaths: z.number().int().nonnegative(),
  untrackedPaths: z.number().int().nonnegative(),
  actorGuess: z.literal("unknown"),
  confidence: z.literal("low"),
  evidence: z.object({
    source: z.literal("git status --porcelain"),
    reflogSubject: z.string().nullable(),
    sample: z.array(z.string()),
  }).strict(),
}).strict();

const gitHookBootstrapStatusSchema = z.object({
  posture: z.enum(["absent", "external_unknown", "installed"]),
  configuredCoreHooksPath: z.string().nullable(),
  resolvedHooksPath: z.string(),
  requiredHooks: z.array(z.string()),
  presentHooks: z.array(z.string()),
  missingHooks: z.array(z.string()),
  supportsCheckoutBoundaries: z.boolean(),
}).strict();

const gitTransitionHookEventSchema = z.object({
  hookName: z.enum(["post-checkout", "post-merge", "post-rewrite"]),
  hookArgs: z.array(z.string()),
  worktreeRoot: z.string(),
  observedAt: z.string(),
}).strict();

const workspaceOverlayFootingSchema = z.object({
  observationMode: z.enum([
    "inferred_between_tool_calls",
    "hook_observed_checkout_boundaries",
  ]),
  lineagePosture: z.enum([
    "stable",
    "forked_after_transition",
  ]),
  boundaryAuthority: z.enum([
    "none",
    "repo_snapshot",
    "hook_observed",
  ]),
  degraded: z.literal(true),
  degradedReason: z.enum([
    "target_repo_hooks_absent",
    "target_repo_hooks_unrecognized",
    "local_edit_watchers_absent",
  ]),
  checkoutEpoch: z.number().int().nonnegative(),
  lastTransition: repoTransitionSchema.nullable(),
  workspaceOverlayId: z.string().nullable(),
  workspaceOverlay: workspaceOverlaySummarySchema.nullable(),
  hookBootstrap: gitHookBootstrapStatusSchema,
  latestHookEvent: gitTransitionHookEventSchema.nullable(),
}).strict();

const policyBoundarySchema = z.object({
  kind: z.literal("shell_escape_hatch"),
  boundedReadContract: z.literal(false),
  policyEnforced: z.literal(false),
}).strict();

const burdenSummarySchema = z.object({
  totalBytesReturned: z.number().int().nonnegative(),
  totalNonReadBytesReturned: z.number().int().nonnegative(),
  topKind: burdenKindSchema.nullable(),
  topBytesReturned: z.number().int().nonnegative(),
  topCalls: z.number().int().nonnegative(),
}).strict();

const workspaceCapabilityProfileSchema = z.object({
  boundedReads: z.boolean(),
  structuralTools: z.boolean(),
  precisionTools: z.boolean(),
  stateBookmarks: z.boolean(),
  runtimeLogs: z.literal("session_local_only"),
  runCapture: z.boolean(),
}).strict();

const workspaceStatusSchema = z.object({
  sessionMode: z.enum(["repo_local", "daemon"]),
  bindState: z.enum(["bound", "unbound"]),
  repoId: z.string().nullable(),
  worktreeId: z.string().nullable(),
  worktreeRoot: z.string().nullable(),
  gitCommonDir: z.string().nullable(),
  graftDir: z.string().nullable(),
  capabilityProfile: workspaceCapabilityProfileSchema.nullable(),
}).strict();

const workspaceActionSchema = workspaceStatusSchema.extend({
  ok: z.boolean(),
  action: z.enum(["bind", "rebind"]),
  freshSessionSlice: z.boolean(),
  errorCode: z.string().optional(),
  error: z.string().optional(),
}).strict();

const activeCausalWorkspaceSchema = z.object({
  causalContext: runtimeCausalContextSchema,
  attribution: attributionSummarySchema,
  latestReadEvent: readEventSchema.nullable(),
  latestStageEvent: stageEventSchema.nullable(),
  latestTransitionEvent: transitionEventSchema.nullable(),
  repoConcurrency: repoConcurrencySummarySchema,
  checkoutEpoch: z.number().int().nonnegative(),
  lastTransition: repoTransitionSchema.nullable(),
  semanticTransition: repoSemanticTransitionSchema.nullable(),
  workspaceOverlayId: z.string().nullable(),
  workspaceOverlay: workspaceOverlaySummarySchema.nullable(),
  workspaceOverlayFooting: workspaceOverlayFootingSchema,
  stagedTarget: runtimeStagedTargetSchema,
}).strict();

const causalStatusSchema = workspaceStatusSchema.extend({
  activeCausalWorkspace: activeCausalWorkspaceSchema.nullable(),
  persistedLocalHistory: persistedLocalHistorySummarySchema,
  nextAction: causalSurfaceNextActionSchema,
}).strict();

const causalAttachSchema = workspaceStatusSchema.extend({
  ok: z.boolean(),
  action: z.literal("attach"),
  activeCausalWorkspace: activeCausalWorkspaceSchema.nullable(),
  persistedLocalHistory: persistedLocalHistorySummarySchema,
  nextAction: causalSurfaceNextActionSchema,
  errorCode: z.string().optional(),
  error: z.string().optional(),
}).strict();

const activityViewSchema = workspaceStatusSchema.extend({
  truthClass: z.literal("artifact_history"),
  anchor: activityViewAnchorSchema,
  summary: activityViewSummarySchema,
  activeCausalWorkspace: z.object({
    causalContext: runtimeCausalContextSchema,
    attribution: attributionSummarySchema,
    repoConcurrency: repoConcurrencySummarySchema.nullable(),
    checkoutEpoch: z.number().int().nonnegative(),
    lastTransition: repoTransitionSchema.nullable(),
    semanticTransition: repoSemanticTransitionSchema.nullable(),
    workspaceOverlayId: z.string().nullable(),
    workspaceOverlay: workspaceOverlaySummarySchema.nullable(),
    workspaceOverlayFooting: workspaceOverlayFootingSchema.nullable(),
    stagedTarget: runtimeStagedTargetSchema,
  }).nullable(),
  activityWindow: z.object({
    historyPath: z.string().nullable(),
    limit: z.number().int().positive(),
    returned: z.number().int().nonnegative(),
    totalMatchingItems: z.number().int().nonnegative(),
    truncated: z.boolean(),
    missingSignalKinds: z.array(z.string()),
    groups: z.array(activityViewGroupSchema),
  }).strict(),
  degradedReasons: z.array(z.string()),
  nextAction: z.union([
    causalSurfaceNextActionSchema,
    z.literal("bind_workspace_to_begin_local_history"),
  ]),
}).strict();

const authorizedWorkspaceSchema = z.object({
  repoId: z.string(),
  worktreeId: z.string(),
  worktreeRoot: z.string(),
  gitCommonDir: z.string(),
  capabilityProfile: workspaceCapabilityProfileSchema,
  authorizedAt: z.string(),
  lastBoundAt: z.string().nullable(),
  activeSessions: z.number().int().nonnegative(),
}).strict();

const workspaceAuthorizeSchema = z.object({
  ok: z.boolean(),
  changed: z.boolean(),
  authorization: authorizedWorkspaceSchema.optional(),
  errorCode: z.string().optional(),
  error: z.string().optional(),
}).strict();

const workspaceRevokeSchema = z.object({
  ok: z.boolean(),
  revoked: z.boolean(),
  repoId: z.string().nullable().optional(),
  worktreeId: z.string().nullable().optional(),
  worktreeRoot: z.string().nullable().optional(),
  activeSessions: z.number().int().nonnegative().optional(),
  errorCode: z.string().optional(),
  error: z.string().optional(),
}).strict();

const daemonSessionSchema = z.object({
  sessionId: z.string(),
  sessionMode: z.literal("daemon"),
  bindState: z.enum(["bound", "unbound"]),
  repoId: z.string().nullable(),
  worktreeId: z.string().nullable(),
  worktreeRoot: z.string().nullable(),
  causalSessionId: z.string().nullable(),
  checkoutEpochId: z.string().nullable(),
  capabilityProfile: workspaceCapabilityProfileSchema.nullable(),
  startedAt: z.string(),
  lastActivityAt: z.string(),
}).strict();

const daemonRepoWorktreeSchema = z.object({
  worktreeId: z.string(),
  worktreeRoot: z.string(),
  activeSessions: z.number().int().nonnegative(),
  lastBoundAt: z.string().nullable(),
}).strict();

const daemonRepoMonitorSchema = z.object({
  workerKind: z.literal("git_poll_indexer"),
  lifecycleState: z.enum(["running", "paused", "stopped"]),
  health: z.enum(["ok", "lagging", "error", "unauthorized", "paused", "stopped"]),
  lastTickAt: z.string().nullable(),
  lastSuccessAt: z.string().nullable(),
  lastError: z.string().nullable(),
}).strict();

const daemonRepoSchema = z.object({
  repoId: z.string(),
  gitCommonDir: z.string(),
  authorizedWorkspaces: z.number().int().nonnegative(),
  boundSessions: z.number().int().nonnegative(),
  activeWorktrees: z.number().int().nonnegative(),
  backlogCommits: z.number().int().nonnegative(),
  lastBoundAt: z.string().nullable(),
  lastActivityAt: z.string().nullable(),
  monitor: daemonRepoMonitorSchema.nullable(),
  worktrees: z.array(daemonRepoWorktreeSchema),
}).strict();

const monitorStatusSchema = z.object({
  repoId: z.string(),
  gitCommonDir: z.string(),
  anchorWorktreeRoot: z.string(),
  authorizedWorkspaces: z.number().int().nonnegative(),
  workerKind: z.literal("git_poll_indexer"),
  lifecycleState: z.enum(["running", "paused", "stopped"]),
  health: z.enum(["ok", "lagging", "error", "unauthorized", "paused", "stopped"]),
  pollIntervalMs: z.number().int().positive(),
  lastStartedAt: z.string().nullable(),
  lastTickAt: z.string().nullable(),
  lastSuccessAt: z.string().nullable(),
  lastError: z.string().nullable(),
  lastIndexedCommit: z.string().nullable(),
  lastHeadCommit: z.string().nullable(),
  backlogCommits: z.number().int().nonnegative(),
  lastRunCommitsIndexed: z.number().int().nonnegative(),
  lastRunPatchesWritten: z.number().int().nonnegative(),
}).strict();

const monitorActionSchema = z.object({
  ok: z.boolean(),
  action: z.enum(["start", "pause", "resume", "stop"]),
  created: z.boolean(),
  changed: z.boolean(),
  status: monitorStatusSchema.optional(),
  errorCode: z.string().optional(),
  error: z.string().optional(),
}).strict();

const daemonSchedulerSchema = z.object({
  maxConcurrentJobs: z.number().int().positive(),
  activeJobs: z.number().int().nonnegative(),
  queuedJobs: z.number().int().nonnegative(),
  interactiveQueuedJobs: z.number().int().nonnegative(),
  backgroundQueuedJobs: z.number().int().nonnegative(),
  activeWriterLanes: z.number().int().nonnegative(),
  queuedWriterLanes: z.number().int().nonnegative(),
  completedJobs: z.number().int().nonnegative(),
  failedJobs: z.number().int().nonnegative(),
  longestQueuedWaitMs: z.number().int().nonnegative(),
}).strict();

const daemonWorkersSchema = z.object({
  mode: z.enum(["inline", "child_processes"]),
  totalWorkers: z.number().int().nonnegative(),
  busyWorkers: z.number().int().nonnegative(),
  idleWorkers: z.number().int().nonnegative(),
  queuedTasks: z.number().int().nonnegative(),
  completedTasks: z.number().int().nonnegative(),
  failedTasks: z.number().int().nonnegative(),
}).strict();

const daemonStatusSchema = z.object({
  ok: z.literal(true),
  sessionMode: z.literal("daemon"),
  transport: z.enum(["unix_socket", "named_pipe"]),
  sameUserOnly: z.literal(true),
  socketPath: z.string(),
  mcpPath: z.string(),
  healthPath: z.string(),
  activeSessions: z.number().int().nonnegative(),
  boundSessions: z.number().int().nonnegative(),
  unboundSessions: z.number().int().nonnegative(),
  activeWarpRepos: z.number().int().nonnegative(),
  authorizedWorkspaces: z.number().int().nonnegative(),
  authorizedRepos: z.number().int().nonnegative(),
  workspaceBindRequiresAuthorization: z.literal(true),
  defaultCapabilityProfile: workspaceCapabilityProfileSchema,
  totalMonitors: z.number().int().nonnegative(),
  runningMonitors: z.number().int().nonnegative(),
  pausedMonitors: z.number().int().nonnegative(),
  stoppedMonitors: z.number().int().nonnegative(),
  failingMonitors: z.number().int().nonnegative(),
  backlogMonitors: z.number().int().nonnegative(),
  scheduler: daemonSchedulerSchema,
  workers: daemonWorkersSchema,
  startedAt: z.string(),
}).strict();

function extendWithCommonFields(
  schema: z.ZodType,
  common: z.ZodRawShape,
): z.ZodType {
  if (schema instanceof z.ZodObject) {
    return schema.extend(common).strict();
  }
  if (schema instanceof z.ZodUnion) {
    return z.union(schema.options.map((option) => {
      if (!(option instanceof z.ZodObject)) {
        throw new Error("Output schema unions must be composed of objects");
      }
      return option.extend(common).strict();
    }) as [z.ZodObject, z.ZodObject, ...z.ZodObject[]]);
  }
  throw new Error("Output schemas must be objects or unions of objects");
}

function withMcpCommon(
  tool: McpToolName,
  schema: z.ZodType,
): z.ZodType {
  return extendWithCommonFields(schema, {
    _schema: schemaMetaLiteral(mcpOutputSchemaMeta[tool]),
    _receipt: receiptSchema,
    tripwire: z.array(tripwireSchema).optional(),
  });
}

function withCliCommon(
  command: CliCommandName,
  schema: z.ZodType,
): z.ZodType {
  return extendWithCommonFields(schema, {
    _schema: schemaMetaLiteral(cliOutputSchemaMeta[command]),
  });
}

function withCliPeerCommon(
  command: CliCommandName,
  schema: z.ZodType,
): z.ZodType {
  return extendWithCommonFields(schema, {
    _schema: schemaMetaLiteral(cliOutputSchemaMeta[command]),
    _receipt: receiptSchema,
    tripwire: z.array(tripwireSchema).optional(),
  });
}

const mcpOutputBodySchemas: Record<McpToolName, z.ZodType> = {
  safe_read: z.object({
    path: z.string(),
    projection: z.enum(["content", "outline", "refused", "error", "cache_hit", "diff"]),
    reason: z.string(),
    actual: actualSchema.optional(),
    thresholds: thresholdsSchema.optional(),
    sessionDepth: sessionDepthSchema.optional(),
    content: z.string().optional(),
    outline: z.array(outlineEntrySchema).optional(),
    jumpTable: z.array(jumpEntrySchema).optional(),
    estimatedBytesAvoided: z.number().int().nonnegative().optional(),
    next: z.array(z.string()).optional(),
    reasonDetail: z.string().optional(),
    readCount: z.number().int().nonnegative().optional(),
    lastReadAt: z.string().optional(),
    diff: outlineDiffSchema.optional(),
  }).strict(),
  file_outline: z.union([
    z.object({
      path: z.string(),
      outline: z.array(outlineEntrySchema),
      jumpTable: z.array(jumpEntrySchema),
      partial: z.boolean().optional(),
      reason: z.string().optional(),
      error: z.string().optional(),
      cacheHit: z.boolean().optional(),
    }).strict(),
    z.object({
      path: z.string(),
      projection: z.literal("refused"),
      reason: z.string(),
      reasonDetail: z.string().optional(),
      next: z.array(z.string()).optional(),
      actual: actualSchema.optional(),
    }).strict(),
  ]),
  read_range: z.object({
    path: z.string(),
    content: z.string().optional(),
    startLine: z.number().int().positive().optional(),
    endLine: z.number().int().positive().optional(),
    reason: z.string().optional(),
    truncated: z.boolean().optional(),
    clipped: z.boolean().optional(),
    projection: z.literal("refused").optional(),
    reasonDetail: z.string().optional(),
    next: z.array(z.string()).optional(),
    actual: actualSchema.optional(),
  }).strict(),
  changed_since: z.object({
    status: z.enum(["file_not_found", "refused", "unsupported", "unchanged", "no_previous_observation"]).optional(),
    reason: z.string().optional(),
    diff: outlineDiffSchema.optional(),
    consumed: z.boolean().optional(),
  }).strict(),
  graft_diff: z.object({
    base: z.string(),
    head: z.string(),
    files: z.array(fileDiffSchema),
    refused: z.array(structuralRefusalSchema).optional(),
    layer: worldlineLayerSchema,
  }).strict(),
  graft_since: z.object({
    base: z.string(),
    head: z.string(),
    files: z.array(fileDiffSchema),
    refused: z.array(structuralRefusalSchema).optional(),
    summary: z.string(),
    layer: z.literal("ref_view"),
  }).strict(),
  graft_map: z.object({
    directory: z.string(),
    files: z.array(mapFileSchema),
    refused: z.array(structuralRefusalSchema).optional(),
    summary: z.string(),
    truncated: z.boolean().optional(),
    truncatedReason: z.enum(["OUTPUT_LIMIT", "BUDGET_EXHAUSTED"]).optional(),
    next: z.array(z.string()).optional(),
  }).strict(),
  code_show: z.object({
    symbol: z.string().optional(),
    kind: z.string().optional(),
    signature: z.string().optional(),
    path: z.string().optional(),
    exported: z.boolean().optional(),
    startLine: z.number().int().positive().optional(),
    endLine: z.number().int().positive().optional(),
    content: z.string().optional(),
    truncated: z.boolean().optional(),
    clipped: z.boolean().optional(),
    source: z.enum(["warp", "live"]),
    layer: worldlineLayerSchema,
    ambiguous: z.boolean().optional(),
    matches: z.array(precisionSymbolMatchSchema).optional(),
    error: z.string().optional(),
    projection: z.literal("refused").optional(),
    reason: z.string().optional(),
    reasonDetail: z.string().optional(),
    next: z.array(z.string()).optional(),
    actual: actualSchema.optional(),
  }).strict(),
  code_find: z.object({
    query: z.string(),
    kind: z.string().nullable(),
    matches: z.array(precisionSymbolMatchSchema).optional(),
    total: z.number().int().nonnegative().optional(),
    path: z.string().optional(),
    projection: z.literal("refused").optional(),
    reason: z.string().optional(),
    reasonDetail: z.string().optional(),
    next: z.array(z.string()).optional(),
    actual: actualSchema.optional(),
    source: z.enum(["warp", "live"]),
    layer: worldlineLayerSchema,
  }).strict(),
  code_refs: z.object({
    query: z.string(),
    mode: z.enum(["text", "import", "call", "property"]),
    scope: z.string(),
    matches: z.array(codeRefsMatchSchema).optional(),
    total: z.number().int().nonnegative().optional(),
    path: z.string().optional(),
    projection: z.literal("refused").optional(),
    reason: z.string().optional(),
    reasonDetail: z.string().optional(),
    next: z.array(z.string()).optional(),
    actual: actualSchema.optional(),
    source: z.literal("text_fallback"),
    provenance: codeRefsProvenanceSchema,
    layer: worldlineLayerSchema,
  }).strict(),
  daemon_repos: z.object({
    repos: z.array(daemonRepoSchema),
    filter: z.object({
      repoId: z.string().optional(),
      cwd: z.string().optional(),
    }).strict().optional(),
  }).strict(),
  daemon_status: daemonStatusSchema,
  daemon_sessions: z.object({
    sessions: z.array(daemonSessionSchema),
  }).strict(),
  daemon_monitors: z.object({
    monitors: z.array(monitorStatusSchema),
  }).strict(),
  monitor_start: monitorActionSchema,
  monitor_pause: monitorActionSchema,
  monitor_resume: monitorActionSchema,
  monitor_stop: monitorActionSchema,
  workspace_authorize: workspaceAuthorizeSchema,
  workspace_authorizations: z.object({
    workspaces: z.array(authorizedWorkspaceSchema),
  }).strict(),
  workspace_revoke: workspaceRevokeSchema,
  workspace_bind: workspaceActionSchema.extend({
    action: z.literal("bind"),
  }).strict(),
  workspace_status: workspaceStatusSchema,
  activity_view: activityViewSchema,
  causal_status: causalStatusSchema,
  causal_attach: causalAttachSchema,
  workspace_rebind: workspaceActionSchema.extend({
    action: z.literal("rebind"),
  }).strict(),
  run_capture: z.object({
    output: z.string(),
    totalLines: z.number().int().nonnegative(),
    tailedLines: z.number().int().nonnegative(),
    logPath: z.string().nullable().optional(),
    logRedactions: z.number().int().nonnegative().optional(),
    logPersistenceEnabled: z.boolean().optional(),
    truncated: z.boolean(),
    disabled: z.boolean().optional(),
    error: z.string().optional(),
    stderr: z.string().optional(),
    policyBoundary: policyBoundarySchema,
  }).strict(),
  state_save: z.object({
    ok: z.boolean(),
    reason: z.string().optional(),
  }).strict(),
  state_load: z.object({
    content: z.string().nullable(),
  }).strict(),
  set_budget: z.object({
    budget: budgetSchema.nullable(),
  }).strict(),
  explain: z.object({
    code: z.string(),
    meaning: z.string().optional(),
    action: z.string().optional(),
    error: z.string().optional(),
    knownCodes: z.string().optional(),
  }).strict(),
  doctor: z.object({
    projectRoot: z.string(),
    parserHealthy: z.boolean(),
    thresholds: thresholdsSchema,
    sessionDepth: z.enum(["early", "mid", "late"]),
    totalMessages: z.number().int().nonnegative(),
    burdenSummary: burdenSummarySchema,
    runtimeObservability: runtimeObservabilitySchema,
    causalContext: runtimeCausalContextSchema,
    latestReadEvent: readEventSchema.nullable(),
    latestStageEvent: stageEventSchema.nullable(),
    latestTransitionEvent: transitionEventSchema.nullable(),
    repoConcurrency: repoConcurrencySummarySchema.nullable(),
    checkoutEpoch: z.number().int().nonnegative(),
    lastTransition: repoTransitionSchema.nullable(),
    semanticTransition: repoSemanticTransitionSchema.nullable(),
    workspaceOverlayId: z.string().nullable(),
    workspaceOverlay: workspaceOverlaySummarySchema.nullable(),
    workspaceOverlayFooting: workspaceOverlayFootingSchema,
    stagedTarget: runtimeStagedTargetSchema,
    attribution: attributionSummarySchema,
    persistedLocalHistory: persistedLocalHistorySummarySchema,
    recommendedNextAction: causalSurfaceNextActionSchema,
  }).strict(),
  stats: z.object({
    totalReads: z.number().int().nonnegative(),
    totalOutlines: z.number().int().nonnegative(),
    totalRefusals: z.number().int().nonnegative(),
    totalCacheHits: z.number().int().nonnegative(),
    totalBytesReturned: z.number().int().nonnegative(),
    totalBytesAvoidedByCache: z.number().int().nonnegative(),
    totalNonReadBytesReturned: z.number().int().nonnegative(),
    burdenByKind: burdenByKindSchema,
  }).strict(),
  graft_churn: z.object({
    entries: z.array(z.object({
      symbol: z.string(),
      filePath: z.string(),
      kind: z.string(),
      changeCount: z.number().int().positive(),
      lastChangedSha: z.string(),
      lastChangedDate: z.string(),
    }).strict()),
    totalSymbols: z.number().int().nonnegative(),
    totalCommitsAnalyzed: z.number().int().nonnegative(),
    summary: z.string(),
  }).strict(),
  graft_exports: z.object({
    base: z.string(),
    head: z.string(),
    added: z.array(z.object({
      symbol: z.string(),
      filePath: z.string(),
      kind: z.string(),
      changeType: z.literal("added"),
      signature: z.string().optional(),
    }).strict()),
    removed: z.array(z.object({
      symbol: z.string(),
      filePath: z.string(),
      kind: z.string(),
      changeType: z.literal("removed"),
      signature: z.string().optional(),
    }).strict()),
    changed: z.array(z.object({
      symbol: z.string(),
      filePath: z.string(),
      kind: z.string(),
      changeType: z.literal("signature_changed"),
      signature: z.string().optional(),
      previousSignature: z.string().optional(),
    }).strict()),
    semverImpact: z.enum(["major", "minor", "patch", "none"]),
    summary: z.string(),
  }).strict(),
  graft_log: z.object({
    entries: z.array(z.object({
      sha: z.string(),
      message: z.string(),
      author: z.string(),
      date: z.string(),
      symbols: z.object({
        added: z.array(z.object({
          name: z.string(),
          kind: z.string(),
          signature: z.string().optional(),
          exported: z.boolean(),
          filePath: z.string(),
        }).strict()),
        removed: z.array(z.object({
          name: z.string(),
          kind: z.string(),
          signature: z.string().optional(),
          exported: z.boolean(),
          filePath: z.string(),
        }).strict()),
        changed: z.array(z.object({
          name: z.string(),
          kind: z.string(),
          signature: z.string().optional(),
          exported: z.boolean(),
          filePath: z.string(),
        }).strict()),
      }).strict(),
      summary: z.string(),
    }).strict()),
    count: z.number().int().nonnegative(),
    layer: z.literal("commit_worldline"),
  }).strict(),
  graft_blame: z.object({
    symbol: z.string(),
    filePath: z.string().optional(),
    currentSignature: z.string().optional(),
    kind: z.string(),
    exported: z.boolean(),
    created: z.object({
      sha: z.string(),
      author: z.string(),
      date: z.string(),
      message: z.string(),
    }).strict().optional(),
    lastSignatureChange: z.object({
      sha: z.string(),
      author: z.string(),
      date: z.string(),
      message: z.string(),
      previousSignature: z.string().optional(),
    }).strict().optional(),
    changeCount: z.number().int().nonnegative(),
    referenceCount: z.number().int().nonnegative(),
    referencingFiles: z.array(z.string()),
    history: z.array(z.object({
      sha: z.string(),
      changeKind: z.string(),
      date: z.string(),
      author: z.string(),
      signature: z.string().optional(),
    }).strict()),
  }).strict(),
  graft_review: z.object({
    base: z.string(),
    head: z.string(),
    totalFiles: z.number().int().nonnegative(),
    categories: z.object({
      structural: z.number().int().nonnegative(),
      formatting: z.number().int().nonnegative(),
      test: z.number().int().nonnegative(),
      docs: z.number().int().nonnegative(),
      config: z.number().int().nonnegative(),
    }).strict(),
    files: z.array(z.object({
      path: z.string(),
      category: z.enum(["structural", "formatting", "test", "docs", "config"]),
      structuralChanges: z.object({
        added: z.number().int().nonnegative(),
        removed: z.number().int().nonnegative(),
        changed: z.number().int().nonnegative(),
      }).strict().optional(),
    }).strict()),
    breakingChanges: z.array(z.object({
      symbol: z.string(),
      kind: z.string(),
      filePath: z.string(),
      changeType: z.enum(["removed_export", "signature_changed", "type_changed"]),
      previousSignature: z.string().optional(),
      newSignature: z.string().optional(),
      impactedFiles: z.number().int().nonnegative(),
      impactedFilePaths: z.array(z.string()),
    }).strict()),
    summary: z.string(),
  }).strict(),
};

export const MCP_OUTPUT_SCHEMAS: Record<McpToolName, z.ZodType> = {
  safe_read: withMcpCommon("safe_read", mcpOutputBodySchemas.safe_read),
  file_outline: withMcpCommon("file_outline", mcpOutputBodySchemas.file_outline),
  read_range: withMcpCommon("read_range", mcpOutputBodySchemas.read_range),
  changed_since: withMcpCommon("changed_since", mcpOutputBodySchemas.changed_since),
  graft_diff: withMcpCommon("graft_diff", mcpOutputBodySchemas.graft_diff),
  graft_since: withMcpCommon("graft_since", mcpOutputBodySchemas.graft_since),
  graft_map: withMcpCommon("graft_map", mcpOutputBodySchemas.graft_map),
  code_show: withMcpCommon("code_show", mcpOutputBodySchemas.code_show),
  code_find: withMcpCommon("code_find", mcpOutputBodySchemas.code_find),
  code_refs: withMcpCommon("code_refs", mcpOutputBodySchemas.code_refs),
  daemon_repos: withMcpCommon("daemon_repos", mcpOutputBodySchemas.daemon_repos),
  daemon_status: withMcpCommon("daemon_status", mcpOutputBodySchemas.daemon_status),
  daemon_sessions: withMcpCommon("daemon_sessions", mcpOutputBodySchemas.daemon_sessions),
  daemon_monitors: withMcpCommon("daemon_monitors", mcpOutputBodySchemas.daemon_monitors),
  monitor_start: withMcpCommon("monitor_start", mcpOutputBodySchemas.monitor_start),
  monitor_pause: withMcpCommon("monitor_pause", mcpOutputBodySchemas.monitor_pause),
  monitor_resume: withMcpCommon("monitor_resume", mcpOutputBodySchemas.monitor_resume),
  monitor_stop: withMcpCommon("monitor_stop", mcpOutputBodySchemas.monitor_stop),
  workspace_authorize: withMcpCommon("workspace_authorize", mcpOutputBodySchemas.workspace_authorize),
  workspace_authorizations: withMcpCommon(
    "workspace_authorizations",
    mcpOutputBodySchemas.workspace_authorizations,
  ),
  workspace_revoke: withMcpCommon("workspace_revoke", mcpOutputBodySchemas.workspace_revoke),
  workspace_bind: withMcpCommon("workspace_bind", mcpOutputBodySchemas.workspace_bind),
  workspace_status: withMcpCommon("workspace_status", mcpOutputBodySchemas.workspace_status),
  activity_view: withMcpCommon("activity_view", mcpOutputBodySchemas.activity_view),
  causal_status: withMcpCommon("causal_status", mcpOutputBodySchemas.causal_status),
  causal_attach: withMcpCommon("causal_attach", mcpOutputBodySchemas.causal_attach),
  workspace_rebind: withMcpCommon("workspace_rebind", mcpOutputBodySchemas.workspace_rebind),
  run_capture: withMcpCommon("run_capture", mcpOutputBodySchemas.run_capture),
  state_save: withMcpCommon("state_save", mcpOutputBodySchemas.state_save),
  state_load: withMcpCommon("state_load", mcpOutputBodySchemas.state_load),
  set_budget: withMcpCommon("set_budget", mcpOutputBodySchemas.set_budget),
  explain: withMcpCommon("explain", mcpOutputBodySchemas.explain),
  doctor: withMcpCommon("doctor", mcpOutputBodySchemas.doctor),
  stats: withMcpCommon("stats", mcpOutputBodySchemas.stats),
  graft_churn: withMcpCommon("graft_churn", mcpOutputBodySchemas.graft_churn),
  graft_exports: withMcpCommon("graft_exports", mcpOutputBodySchemas.graft_exports),
  graft_log: withMcpCommon("graft_log", mcpOutputBodySchemas.graft_log),
  graft_blame: withMcpCommon("graft_blame", mcpOutputBodySchemas.graft_blame),
  graft_review: withMcpCommon("graft_review", mcpOutputBodySchemas.graft_review),
};

const initActionSchema = z.object({
  action: z.enum(["exists", "create", "append"]),
  label: z.string(),
  detail: z.string().optional(),
}).strict();

const hooksConfigSchema = z.object({
  hooks: z.object({
    PreToolUse: z.array(z.object({
      matcher: z.literal("Read"),
      hooks: z.array(z.object({
        type: z.literal("command"),
        command: z.string(),
      }).strict()),
    }).strict()),
    PostToolUse: z.array(z.object({
      matcher: z.literal("Read"),
      hooks: z.array(z.object({
        type: z.literal("command"),
        command: z.string(),
      }).strict()),
    }).strict()),
  }).strict(),
}).strict();

const suggestedMcpServerSchema = z.object({
  mcpServers: z.object({
    graft: z.object({
      command: z.literal("npx"),
      args: z.tuple([z.literal("-y"), z.literal("@flyingrobots/graft"), z.literal("serve")]),
    }).strict(),
  }).strict(),
}).strict();

export const CLI_OUTPUT_SCHEMAS: Record<CliCommandName, z.ZodType> = {
  init: withCliCommon("init", z.object({
    ok: z.boolean(),
    cwd: z.string(),
    actions: z.array(initActionSchema).optional(),
    hooksConfig: hooksConfigSchema.optional(),
    suggestedMcpServer: suggestedMcpServerSchema.optional(),
    error: z.string().optional(),
  }).strict()),
  index: withCliCommon("index", z.object({
    ok: z.boolean(),
    cwd: z.string(),
    from: z.string().nullable(),
    commitsIndexed: z.number().int().nonnegative().optional(),
    patchesWritten: z.number().int().nonnegative().optional(),
    error: z.string().optional(),
  }).strict()),
  read_safe: withCliPeerCommon("read_safe", mcpOutputBodySchemas.safe_read),
  read_outline: withCliPeerCommon("read_outline", mcpOutputBodySchemas.file_outline),
  read_range: withCliPeerCommon("read_range", mcpOutputBodySchemas.read_range),
  read_changed: withCliPeerCommon("read_changed", mcpOutputBodySchemas.changed_since),
  struct_diff: withCliPeerCommon("struct_diff", mcpOutputBodySchemas.graft_diff),
  struct_since: withCliPeerCommon("struct_since", mcpOutputBodySchemas.graft_since),
  struct_map: withCliPeerCommon("struct_map", mcpOutputBodySchemas.graft_map),
  symbol_show: withCliPeerCommon("symbol_show", mcpOutputBodySchemas.code_show),
  symbol_find: withCliPeerCommon("symbol_find", mcpOutputBodySchemas.code_find),
  struct_churn: withCliPeerCommon("struct_churn", mcpOutputBodySchemas.graft_churn),
  struct_exports: withCliPeerCommon("struct_exports", mcpOutputBodySchemas.graft_exports),
  struct_log: withCliPeerCommon("struct_log", mcpOutputBodySchemas.graft_log),
  symbol_blame: withCliPeerCommon("symbol_blame", mcpOutputBodySchemas.graft_blame),
  struct_review: withCliPeerCommon("struct_review", mcpOutputBodySchemas.graft_review),
  diag_doctor: withCliPeerCommon("diag_doctor", mcpOutputBodySchemas.doctor),
  diag_activity: withCliPeerCommon("diag_activity", mcpOutputBodySchemas.activity_view),
  diag_explain: withCliPeerCommon("diag_explain", mcpOutputBodySchemas.explain),
  diag_stats: withCliPeerCommon("diag_stats", mcpOutputBodySchemas.stats),
  diag_capture: withCliPeerCommon("diag_capture", mcpOutputBodySchemas.run_capture),
  migrate_local_history: withCliCommon("migrate_local_history", z.object({
    cwd: z.string(),
    graftDir: z.string(),
    discoveredArtifacts: z.number().int().nonnegative(),
    migratedArtifacts: z.number().int().nonnegative(),
    malformedArtifacts: z.number().int().nonnegative(),
    importedContinuityRecords: z.number().int().nonnegative(),
    importedReadEvents: z.number().int().nonnegative(),
    importedStageEvents: z.number().int().nonnegative(),
    importedTransitionEvents: z.number().int().nonnegative(),
    skippedContinuityRecords: z.number().int().nonnegative(),
    skippedReadEvents: z.number().int().nonnegative(),
    skippedStageEvents: z.number().int().nonnegative(),
    skippedTransitionEvents: z.number().int().nonnegative(),
    error: z.string().optional(),
  }).strict()),
  diag_local_history_dag: withCliCommon("diag_local_history_dag", z.object({
    cwd: z.string(),
    repoId: z.string(),
    worktreeId: z.string(),
    requestedEventLimit: z.number().int().positive(),
    totalEventCount: z.number().int().nonnegative(),
    shownEventCount: z.number().int().nonnegative(),
    nodeCount: z.number().int().nonnegative(),
    edgeCount: z.number().int().nonnegative(),
    truncated: z.boolean(),
    rendered: z.string(),
    nodes: z.array(z.record(z.string(), z.unknown())),
    edges: z.array(z.record(z.string(), z.unknown())),
    error: z.string().optional(),
  }).strict()),
};

export function getMcpOutputSchemaMeta(tool: McpToolName): OutputSchemaMeta {
  return mcpOutputSchemaMeta[tool];
}

export function getCliOutputSchemaMeta(command: CliCommandName): OutputSchemaMeta {
  return cliOutputSchemaMeta[command];
}

export function getMcpOutputSchema(tool: McpToolName): z.ZodType {
  return MCP_OUTPUT_SCHEMAS[tool];
}

export function getCliOutputSchema(command: CliCommandName): z.ZodType {
  return CLI_OUTPUT_SCHEMAS[command];
}

export function attachMcpSchemaMeta<T extends object>(
  tool: McpToolName,
  data: T,
): T & { _schema: OutputSchemaMeta } {
  return { ...data, _schema: getMcpOutputSchemaMeta(tool) };
}

export function attachCliSchemaMeta<T extends object>(
  command: CliCommandName,
  data: T,
): T & { _schema: OutputSchemaMeta } {
  return { ...data, _schema: getCliOutputSchemaMeta(command) };
}

export function validateCliOutput(
  command: CliCommandName,
  data: unknown,
): Record<string, unknown> {
  return CLI_OUTPUT_SCHEMAS[command].parse(data) as Record<string, unknown>;
}

export function cliCommandMcpTool(command: CliCommandName): McpToolName | null {
  return CLI_COMMAND_TO_MCP_TOOL[command] ?? null;
}

export function getMcpOutputJsonSchema(tool: McpToolName): unknown {
  return z.toJSONSchema(MCP_OUTPUT_SCHEMAS[tool]);
}

export function getCliOutputJsonSchema(command: CliCommandName): unknown {
  return z.toJSONSchema(CLI_OUTPUT_SCHEMAS[command]);
}

/** Inferred output type for a given MCP tool name. */
export type McpOutputFor<K extends McpToolName> = z.output<(typeof MCP_OUTPUT_SCHEMAS)[K]>;

/** Inferred output type for a given CLI command name. */
export type CliOutputFor<K extends CliCommandName> = z.output<(typeof CLI_OUTPUT_SCHEMAS)[K]>;

export const DIAG_ACTIVITY_CLI_SCHEMA = activityViewSchema.extend({ _schema: z.unknown().optional(), _receipt: z.unknown().optional(), tripwire: z.unknown().optional() }).strict();

export const RECEIPT_SCHEMA = receiptSchema;
export const RECEIPT_JSON_SCHEMA = z.toJSONSchema(receiptSchema);
