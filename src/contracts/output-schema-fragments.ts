import { z } from "zod";
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

export const sessionDepthSchema = z.enum(["early", "mid", "late", "unknown"]);
export const worldlineLayerSchema = z.enum(["commit_worldline", "ref_view", "workspace_overlay"]);
export const repoTransitionKindSchema = z.enum(["checkout", "reset", "merge", "rebase"]);

export const actualSchema = z.object({
  lines: z.number().int().nonnegative(),
  bytes: z.number().int().nonnegative(),
}).strict();

export const thresholdsSchema = z.object({
  lines: z.number().int().nonnegative(),
  bytes: z.number().int().nonnegative(),
}).strict();

export const budgetSchema = z.object({
  total: z.number().int().positive(),
  consumed: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  fraction: z.number(),
}).strict();

export const tripwireSchema = z.object({
  _brand: z.literal("Tripwire").optional(),
  signal: z.string(),
  recommendation: z.string(),
}).strict();

export const outlineEntrySchema: z.ZodType = z.lazy(() => z.object({
  _brand: z.literal("OutlineEntry").optional(),
  kind: z.string(),
  name: z.string(),
  signature: z.string().optional(),
  exported: z.boolean(),
  children: z.array(outlineEntrySchema).optional(),
}).strict());

export const jumpEntrySchema = z.object({
  _brand: z.literal("JumpEntry").optional(),
  symbol: z.string(),
  kind: z.string(),
  start: z.number().int().positive(),
  end: z.number().int().positive(),
}).strict();

export const diffContinuitySchema = z.object({
  _brand: z.literal("DiffContinuity").optional(),
  kind: z.literal("rename"),
  confidence: z.literal("likely"),
  basis: z.enum(["matching_signature_shape", "matching_child_structure"]),
  symbolKind: z.string(),
  oldName: z.string(),
  newName: z.string(),
  oldSignature: z.string().optional(),
  newSignature: z.string().optional(),
}).strict();

export const outlineDiffSchema: z.ZodType = z.lazy(() => z.object({
  _brand: z.literal("OutlineDiff").optional(),
  added: z.array(diffEntrySchema),
  removed: z.array(diffEntrySchema),
  changed: z.array(diffEntrySchema),
  continuity: z.array(diffContinuitySchema),
  unchangedCount: z.number().int().nonnegative(),
}).strict());

export const diffEntrySchema: z.ZodType = z.lazy(() => z.object({
  _brand: z.literal("DiffEntry").optional(),
  name: z.string(),
  kind: z.string(),
  exported: z.boolean().optional(),
  signature: z.string().optional(),
  oldSignature: z.string().optional(),
  childDiff: outlineDiffSchema.optional(),
}).strict());

export const burdenKindSchema = z.enum(["read", "search", "shell", "state", "diagnostic"]);

const burdenBucketSchema = z.object({
  calls: z.number().int().nonnegative(),
  bytesReturned: z.number().int().nonnegative(),
}).strict();

export const burdenByKindSchema = z.object({
  read: burdenBucketSchema,
  search: burdenBucketSchema,
  shell: burdenBucketSchema,
  state: burdenBucketSchema,
  diagnostic: burdenBucketSchema,
}).strict();

export const sludgeSignalSchema = z.object({
  kind: z.enum([
    "phantom_shape",
    "cast_density",
    "homeless_constructor",
    "free_function_data_behavior",
    "god_file",
  ]),
  severity: z.enum(["low", "medium", "high"]),
  message: z.string(),
  line: z.number().int().positive().optional(),
  symbol: z.string().optional(),
  evidence: z.string(),
}).strict();

export const sludgeFileReportSchema = z.object({
  path: z.string(),
  score: z.number().int().nonnegative(),
  metrics: z.object({
    typedefCount: z.number().int().nonnegative(),
    typeCastCount: z.number().int().nonnegative(),
    classCount: z.number().int().nonnegative(),
    functionCount: z.number().int().nonnegative(),
    symbolCount: z.number().int().nonnegative(),
    homelessConstructorCount: z.number().int().nonnegative(),
    freeFunctionDataBehaviorCount: z.number().int().nonnegative(),
  }).strict(),
  signals: z.array(sludgeSignalSchema),
}).strict();

export const sludgeReportSchema = z.object({
  scannedFiles: z.number().int().nonnegative(),
  filesWithSignals: z.number().int().nonnegative(),
  totalSignals: z.number().int().nonnegative(),
  score: z.number().int().nonnegative(),
  files: z.array(sludgeFileReportSchema),
  summary: z.string(),
}).strict();

export const receiptSchema = z.object({
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

export const runtimeObservabilitySchema = z.object({
  enabled: z.boolean(),
  logPath: z.string(),
  maxBytes: z.number().int().positive(),
  logPolicy: z.literal("metadata_only"),
}).strict();

export const runtimeCausalContextSchema = z.object({
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

export const runtimeStagedTargetSchema = z.discriminatedUnion("availability", [
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

export const activityViewAnchorSchema = z.discriminatedUnion("posture", [
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

export const activityViewItemSchema = z.union([
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

export const persistedLocalHistorySummarySchema = z.discriminatedUnion("availability", [
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

export const repoConcurrencySummarySchema = z.object({
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

export const precisionSymbolMatchSchema = z.object({
  name: z.string(),
  kind: z.string(),
  path: z.string(),
  identityId: z.string().optional(),
  signature: z.string().optional(),
  exported: z.boolean(),
  startLine: z.number().int().positive().optional(),
  endLine: z.number().int().positive().optional(),
}).strict();

export const codeRefsMatchSchema = z.object({
  path: z.string(),
  line: z.number().int().positive(),
  column: z.number().int().positive().optional(),
  preview: z.string(),
}).strict();

export const codeRefsProvenanceSchema = z.object({
  engine: z.enum(["ripgrep", "grep"]),
  pattern: z.string(),
  approximate: z.literal(true),
  filesSearched: z.number().int().nonnegative(),
}).strict();

export const structuralRefusalSchema = z.object({
  path: z.string(),
  reason: z.string(),
  reasonDetail: z.string(),
  next: z.array(z.string()),
  actual: actualSchema,
}).strict();

const mapSymbolSchema = z.object({
  name: z.string(),
  kind: z.string(),
  signature: z.string().optional(),
  exported: z.boolean(),
  startLine: z.number().int().positive().optional(),
  endLine: z.number().int().positive().optional(),
}).strict();

export const mapFileSchema = z.object({
  path: z.string(),
  lang: z.string(),
  symbolCount: z.number().int().nonnegative(),
  summaryOnly: z.boolean(),
  symbols: z.array(mapSymbolSchema).optional(),
}).strict();

export const mapDirectorySchema = z.object({
  path: z.string(),
  fileCount: z.number().int().positive(),
  symbolCount: z.number().int().nonnegative(),
  childDirectoryCount: z.number().int().nonnegative(),
  summaryOnly: z.literal(true),
}).strict();

export const mapModeSchema = z.object({
  depth: z.number().int().nonnegative().nullable(),
  summary: z.boolean(),
}).strict();

export const fileDiffSchema = z.object({
  path: z.string(),
  status: z.enum(["modified", "added", "deleted"]),
  summary: z.string(),
  diff: outlineDiffSchema,
}).strict();

export const repoTransitionSchema = z.object({
  kind: repoTransitionKindSchema,
  fromRef: z.string().nullable(),
  toRef: z.string().nullable(),
  fromCommit: z.string().nullable(),
  toCommit: z.string().nullable(),
  evidence: z.object({
    reflogSubject: z.string().nullable(),
  }).strict(),
}).strict();

export const repoSemanticTransitionSchema = z.object({
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

export const workspaceOverlaySummarySchema = z.object({
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

export const workspaceOverlayFootingSchema = z.object({
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

export const policyBoundarySchema = z.object({
  kind: z.literal("shell_escape_hatch"),
  boundedReadContract: z.literal(false),
  policyEnforced: z.literal(false),
}).strict();

export const burdenSummarySchema = z.object({
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

export const workspaceStatusSchema = z.object({
  sessionMode: z.enum(["repo_local", "daemon"]),
  bindState: z.enum(["bound", "unbound"]),
  repoId: z.string().nullable(),
  worktreeId: z.string().nullable(),
  worktreeRoot: z.string().nullable(),
  gitCommonDir: z.string().nullable(),
  graftDir: z.string().nullable(),
  capabilityProfile: workspaceCapabilityProfileSchema.nullable(),
}).strict();

export const workspaceActionSchema = workspaceStatusSchema.extend({
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

export const causalStatusSchema = workspaceStatusSchema.extend({
  activeCausalWorkspace: activeCausalWorkspaceSchema.nullable(),
  persistedLocalHistory: persistedLocalHistorySummarySchema,
  nextAction: causalSurfaceNextActionSchema,
}).strict();

export const causalAttachSchema = workspaceStatusSchema.extend({
  ok: z.boolean(),
  action: z.literal("attach"),
  activeCausalWorkspace: activeCausalWorkspaceSchema.nullable(),
  persistedLocalHistory: persistedLocalHistorySummarySchema,
  nextAction: causalSurfaceNextActionSchema,
  errorCode: z.string().optional(),
  error: z.string().optional(),
}).strict();

export const activityViewSchema = workspaceStatusSchema.extend({
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

export const authorizedWorkspaceSchema = z.object({
  repoId: z.string(),
  worktreeId: z.string(),
  worktreeRoot: z.string(),
  gitCommonDir: z.string(),
  capabilityProfile: workspaceCapabilityProfileSchema,
  authorizedAt: z.string(),
  lastBoundAt: z.string().nullable(),
  activeSessions: z.number().int().nonnegative(),
}).strict();

export const workspaceAuthorizeSchema = z.object({
  ok: z.boolean(),
  changed: z.boolean(),
  authorization: authorizedWorkspaceSchema.optional(),
  errorCode: z.string().optional(),
  error: z.string().optional(),
}).strict();

export const workspaceRevokeSchema = z.object({
  ok: z.boolean(),
  revoked: z.boolean(),
  repoId: z.string().nullable().optional(),
  worktreeId: z.string().nullable().optional(),
  worktreeRoot: z.string().nullable().optional(),
  activeSessions: z.number().int().nonnegative().optional(),
  errorCode: z.string().optional(),
  error: z.string().optional(),
}).strict();

export const daemonSessionSchema = z.object({
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

export const daemonRepoSchema = z.object({
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

export const monitorStatusSchema = z.object({
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

export const monitorActionSchema = z.object({
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

export const daemonStatusSchema = z.object({
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

export const localHistoryDagNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  entityKind: z.string(),
  eventKind: z.string().optional(),
  occurredAt: z.string().optional(),
}).strict();

export const localHistoryDagEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string(),
}).strict();

export const cliFragmentSchemas = {
  initActionSchema,
  hooksConfigSchema,
  suggestedMcpServerSchema,
};

export const mcpFragmentSchemas = {
  actualSchema,
  thresholdsSchema,
  budgetSchema,
  tripwireSchema,
  outlineEntrySchema,
  jumpEntrySchema,
  outlineDiffSchema,
  mapFileSchema,
  mapDirectorySchema,
  mapModeSchema,
  fileDiffSchema,
  burdenByKindSchema,
  sludgeReportSchema,
  burdenSummarySchema,
  receiptSchema,
  runtimeObservabilitySchema,
  runtimeCausalContextSchema,
  runtimeStagedTargetSchema,
  persistedLocalHistorySummarySchema,
  repoConcurrencySummarySchema,
  precisionSymbolMatchSchema,
  codeRefsMatchSchema,
  codeRefsProvenanceSchema,
  structuralRefusalSchema,
  worldlineLayerSchema,
  activityViewSchema,
  causalStatusSchema,
  causalAttachSchema,
  workspaceAuthorizeSchema,
  workspaceRevokeSchema,
  workspaceStatusSchema,
  workspaceActionSchema,
  workspaceOverlaySummarySchema,
  workspaceOverlayFootingSchema,
  authorizedWorkspaceSchema,
  policyBoundarySchema,
  daemonStatusSchema,
  daemonSessionSchema,
  daemonRepoSchema,
  monitorStatusSchema,
  monitorActionSchema,
  repoTransitionSchema,
  repoSemanticTransitionSchema,
  sessionDepthSchema,
};
