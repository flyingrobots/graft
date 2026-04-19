// ---------------------------------------------------------------------------
// workspace-router-history — persisted local history query operations
//
// Pure functions that query and observe persisted local history state.
// Extracted from WorkspaceRouter to separate history concerns from
// workspace lifecycle orchestration.
// ---------------------------------------------------------------------------
import { buildRuntimeStagedTarget } from "./runtime-staged-target.js";
import {
  buildWorkspaceReadObservation,
  type AttributedReadToolName,
} from "./workspace-read-observation.js";
import type {
  PersistedLocalActivityWindow,
  PersistedLocalHistoryStore,
  RepoConcurrencySummary,
  PersistedLocalHistorySummary,
  PersistedLocalHistoryContext,
} from "./persisted-local-history.js";
import type { PersistedLocalHistoryGraphContext } from "./persisted-local-history-graph.js";
import type { RepoObservation } from "./repo-state.js";
import type { RuntimeCausalContext } from "./runtime-causal-context.js";
import type {
  WorkspaceExecutionContext,
  WorkspaceStatus,
} from "./workspace-router-model.js";
import type { JsonObject } from "../contracts/json-object.js";
import type { BoundWorkspace } from "./workspace-router-runtime.js";

// ---------------------------------------------------------------------------
// Unbound fallback — returned when no workspace is bound
// ---------------------------------------------------------------------------

export const UNBOUND_PERSISTED_LOCAL_HISTORY_SUMMARY: PersistedLocalHistorySummary = Object.freeze({
  availability: "none",
  persistence: "persisted_local_history",
  historyPath: null,
  totalContinuityRecords: 0,
  active: false,
  lastOperation: null,
  lastObservedAt: null,
  continuityKey: null,
  causalSessionId: null,
  strandId: null,
  checkoutEpochId: null,
  continuedFromCausalSessionId: null,
  continuityConfidence: "unknown",
  continuityEvidence: [],
  attribution: Object.freeze({
    actor: Object.freeze({
      actorId: "unknown",
      actorKind: "unknown",
      displayName: "Unknown",
      source: "persisted_local_history.fallback",
      authorityScope: "inferred",
    }),
    confidence: "unknown",
    basis: "unknown_fallback",
    evidence: [],
  }),
  latestReadEvent: null,
  latestStageEvent: null,
  latestTransitionEvent: null,
  preserves: Object.freeze([
    "continuity_operations",
    "read_events",
    "stage_events",
    "transition_events",
    "runtime_context_ids",
    "workspace_overlay_snapshots",
  ]),
  excludes: Object.freeze([
    "raw_chat_transcripts",
    "queue_bookkeeping",
    "canonical_provenance",
    "canonical_structural_truth",
  ]),
  nextAction: "bind_workspace_to_begin_local_history",
} as PersistedLocalHistorySummary);

export const UNBOUND_PERSISTED_LOCAL_ACTIVITY_WINDOW = Object.freeze({
  historyPath: null,
  totalMatchingItems: 0,
  truncated: false,
  items: Object.freeze([]),
});

// ---------------------------------------------------------------------------
// History query functions
// ---------------------------------------------------------------------------

/**
 * Retrieve the persisted local history summary for a bound workspace,
 * including side-effect observations for semantic transitions and staged targets.
 */
export async function queryPersistedLocalHistorySummary(input: {
  readonly persistedLocalHistory: PersistedLocalHistoryStore;
  readonly binding: BoundWorkspace;
  readonly status: WorkspaceStatus;
  readonly buildCausalContext: (
    binding: BoundWorkspace,
    observation: { readonly checkoutEpoch: number },
  ) => RuntimeCausalContext;
  readonly buildHistoryContext: (
    binding: BoundWorkspace,
    observation: RepoObservation,
  ) => PersistedLocalHistoryContext;
  readonly buildGraphContext: (
    binding: BoundWorkspace,
  ) => Promise<PersistedLocalHistoryGraphContext | null>;
}): Promise<PersistedLocalHistorySummary> {
  const { persistedLocalHistory, binding, status, buildCausalContext, buildHistoryContext, buildGraphContext } = input;
  const repoState = binding.slice.repoState;
  if (repoState === null) {
    return UNBOUND_PERSISTED_LOCAL_HISTORY_SUMMARY;
  }
  const observation = repoState.getState();
  const causalContext = buildCausalContext(binding, observation);
  const graph = await buildGraphContext(binding);
  let summary = await persistedLocalHistory.summarize(status, causalContext, graph);

  if (observation.semanticTransition !== null) {
    await persistedLocalHistory.noteSemanticTransitionObservation({
      current: buildHistoryContext(binding, observation),
      semanticTransition: observation.semanticTransition,
      transition: observation.lastTransition,
      attribution: summary.attribution,
      graph,
    });
    summary = await persistedLocalHistory.summarize(status, causalContext, graph);
  }

  const stagedTarget = buildRuntimeStagedTarget(status, causalContext, observation, summary.attribution);

  if (stagedTarget.availability === "full_file") {
    await persistedLocalHistory.noteStageObservation({
      current: buildHistoryContext(binding, observation),
      stagedTarget,
      attribution: summary.attribution,
      graph,
    });
    return persistedLocalHistory.summarize(status, causalContext, graph);
  }

  return summary;
}

/**
 * Retrieve the repo concurrency summary for a bound workspace.
 */
export async function queryRepoConcurrencySummary(input: {
  readonly persistedLocalHistory: PersistedLocalHistoryStore;
  readonly status: WorkspaceStatus;
  readonly buildGraphContext: (
    binding: BoundWorkspace,
  ) => Promise<PersistedLocalHistoryGraphContext | null>;
  readonly binding: BoundWorkspace;
}): Promise<RepoConcurrencySummary | null> {
  return input.persistedLocalHistory.summarizeRepoConcurrency(
    input.status,
    await input.buildGraphContext(input.binding),
  );
}

/**
 * Retrieve the persisted local activity window for a bound workspace.
 */
export async function queryPersistedLocalActivityWindow(input: {
  readonly persistedLocalHistory: PersistedLocalHistoryStore;
  readonly binding: BoundWorkspace;
  readonly status: WorkspaceStatus;
  readonly limit: number;
  readonly buildCausalContext: (
    binding: BoundWorkspace,
    observation: { readonly checkoutEpoch: number },
  ) => RuntimeCausalContext;
  readonly buildGraphContext: (
    binding: BoundWorkspace,
  ) => Promise<PersistedLocalHistoryGraphContext | null>;
  readonly refreshSummary: () => Promise<void>;
}): Promise<PersistedLocalActivityWindow> {
  const { persistedLocalHistory, binding, status, limit, buildCausalContext, buildGraphContext, refreshSummary } = input;
  const repoState = binding.slice.repoState;
  if (repoState === null) {
    return { ...UNBOUND_PERSISTED_LOCAL_ACTIVITY_WINDOW, limit } as PersistedLocalActivityWindow;
  }
  await refreshSummary();
  const observation = repoState.getState();
  const causalContext = buildCausalContext(binding, observation);
  const graph = await buildGraphContext(binding);
  return persistedLocalHistory.listRecentActivity(status, causalContext, limit, graph);
}

/**
 * Record a read observation against persisted local history.
 */
export async function noteReadObservation(input: {
  readonly persistedLocalHistory: PersistedLocalHistoryStore;
  readonly execution: WorkspaceExecutionContext;
  readonly toolName: AttributedReadToolName;
  readonly args: JsonObject;
  readonly result: JsonObject;
  readonly buildHistoryContextFromExecution: (
    execution: WorkspaceExecutionContext,
    observation: RepoObservation,
  ) => PersistedLocalHistoryContext;
  readonly buildGraphContextFromExecution: (
    execution: WorkspaceExecutionContext,
  ) => Promise<PersistedLocalHistoryGraphContext | null>;
}): Promise<void> {
  const {
    persistedLocalHistory, execution, toolName, args, result,
    buildHistoryContextFromExecution, buildGraphContextFromExecution,
  } = input;

  const readObservation = buildWorkspaceReadObservation(execution, toolName, args, result);
  if (readObservation === null) {
    return;
  }

  const summary = await persistedLocalHistory.summarize(
    execution.status,
    execution.getCausalContext(),
    await buildGraphContextFromExecution(execution),
  );

  await persistedLocalHistory.noteReadObservation({
    current: buildHistoryContextFromExecution(execution, execution.repoState.getState()),
    attribution: summary.attribution,
    graph: await buildGraphContextFromExecution(execution),
    ...readObservation,
  });
}
