import type {
  AttributionSummary,
  Evidence,
} from "../contracts/causal-ontology.js";
import type { RuntimeCausalContext } from "./runtime-causal-context.js";
import {
  buildRepoConcurrencyContributorKey,
  buildRepoConcurrencyTouches,
  type RepoConcurrencyWorktreeHistory,
} from "./repo-concurrency.js";
import type {
  ContinuityRecord,
  ContinuityState,
  PersistedLocalActivityContinuityItem,
  PersistedLocalActivityItem,
  PersistedLocalActivityWindow,
  PersistedLocalHistorySummary,
  PersistedLocalHistorySummaryNone,
} from "./persisted-local-history.js";

export function findRecord(state: ContinuityState, recordId: string | null): ContinuityRecord | null {
  if (recordId === null) return null;
  for (let index = state.records.length - 1; index >= 0; index--) {
    const record = state.records[index];
    if (record?.recordId === recordId) {
      return record;
    }
  }
  return null;
}

export function buildUnknownAttribution(): AttributionSummary {
  return {
    actor: {
      actorId: "unknown",
      actorKind: "unknown",
      displayName: "Unknown",
      source: "persisted_local_history.fallback",
      authorityScope: "inferred",
    },
    confidence: "unknown",
    basis: "unknown_fallback",
    evidence: [],
  };
}

export function emptyPersistedLocalHistorySummary(input: {
  readonly preserves: readonly string[];
  readonly excludes: readonly string[];
}): PersistedLocalHistorySummaryNone {
  return {
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
    attribution: buildUnknownAttribution(),
    latestReadEvent: null,
    latestStageEvent: null,
    latestTransitionEvent: null,
    preserves: input.preserves,
    excludes: input.excludes,
    nextAction: "bind_workspace_to_begin_local_history",
  };
}

export function emptyPersistedLocalActivityWindow(limit: number): PersistedLocalActivityWindow {
  return {
    historyPath: null,
    limit,
    totalMatchingItems: 0,
    truncated: false,
    items: [],
  };
}

export function summarizeContinuityState(input: {
  readonly state: ContinuityState;
  readonly causalContext: RuntimeCausalContext;
  readonly preserves: readonly string[];
  readonly excludes: readonly string[];
}): PersistedLocalHistorySummary {
  const activeRecord = findRecord(input.state, input.state.activeRecordId);
  const lastRecord = input.state.records.at(-1) ?? null;
  if (lastRecord === null) {
    return emptyPersistedLocalHistorySummary({
      preserves: input.preserves,
      excludes: input.excludes,
    });
  }

  const effectiveRecord = activeRecord ?? lastRecord;
  return {
    availability: "present",
    persistence: "persisted_local_history",
    historyPath: null,
    totalContinuityRecords: input.state.records.length,
    active: activeRecord !== null,
    lastOperation: lastRecord.operation,
    lastObservedAt: lastRecord.occurredAt,
    continuityKey: input.state.continuityKey,
    causalSessionId: effectiveRecord.causalSessionId,
    strandId: effectiveRecord.strandId,
    checkoutEpochId: effectiveRecord.checkoutEpochId,
    continuedFromCausalSessionId: lastRecord.continuedFromCausalSessionId,
    continuityConfidence: lastRecord.continuityConfidence,
    continuityEvidence: lastRecord.continuityEvidence,
    attribution: effectiveRecord.attribution,
    latestReadEvent: input.state.readEvents.at(-1) ?? null,
    latestStageEvent: input.state.stageEvents.at(-1) ?? null,
    latestTransitionEvent: input.state.transitionEvents.at(-1) ?? null,
    preserves: input.preserves,
    excludes: input.excludes,
    nextAction: activeRecord?.causalSessionId === input.causalContext.causalSessionId
      ? (lastRecord.operation === "fork"
          ? "review_transition_boundary_before_continuing"
          : "continue_active_causal_workspace")
      : "inspect_or_resume_local_history",
  };
}

export function buildPersistedLocalActivityWindow(input: {
  readonly state: ContinuityState;
  readonly causalContext: RuntimeCausalContext;
  readonly limit: number;
}): PersistedLocalActivityWindow {
  const activeRecord = findRecord(input.state, input.state.activeRecordId);
  const effectiveCheckoutEpochId =
    activeRecord?.checkoutEpochId
    ?? input.state.records.at(-1)?.checkoutEpochId
    ?? input.causalContext.checkoutEpochId;

  const continuityItems: PersistedLocalActivityContinuityItem[] = input.state.records
    .filter((record) => record.checkoutEpochId === effectiveCheckoutEpochId)
    .map((record) => ({
      itemKind: "continuity",
      recordId: record.recordId,
      operation: record.operation,
      occurredAt: record.occurredAt,
      causalSessionId: record.causalSessionId,
      strandId: record.strandId,
      attribution: record.attribution,
      continuedFromCausalSessionId: record.continuedFromCausalSessionId,
      continuedFromStrandId: record.continuedFromStrandId,
    }));

  const eventItems: PersistedLocalActivityItem[] = [
    ...input.state.readEvents,
    ...input.state.stageEvents,
    ...input.state.transitionEvents,
  ].filter((event) => event.checkoutEpochId === effectiveCheckoutEpochId);

  const allItems = [...continuityItems, ...eventItems].sort((left, right) => {
    const byTime = right.occurredAt.localeCompare(left.occurredAt);
    if (byTime !== 0) {
      return byTime;
    }
    const leftId = "recordId" in left ? left.recordId : left.eventId;
    const rightId = "recordId" in right ? right.recordId : right.eventId;
    return rightId.localeCompare(leftId);
  });

  return {
    historyPath: null,
    limit: input.limit,
    totalMatchingItems: allItems.length,
    truncated: allItems.length > input.limit,
    items: allItems.slice(0, input.limit),
  };
}

export function toRepoConcurrencyWorktreeHistory(state: ContinuityState): RepoConcurrencyWorktreeHistory {
  const effectiveRecord = findRecord(state, state.activeRecordId) ?? state.records.at(-1) ?? null;
  const checkoutEpochId = effectiveRecord?.checkoutEpochId ?? null;
  const recordsForEpoch = checkoutEpochId === null
    ? []
    : state.records.filter((record) => record.checkoutEpochId === checkoutEpochId);
  const eventsForEpoch = checkoutEpochId === null
    ? []
    : [...state.readEvents, ...state.stageEvents, ...state.transitionEvents]
      .filter((event) => event.checkoutEpochId === checkoutEpochId);

  const contributorKeys = new Set<string>();
  const actorIds = new Set<string>();
  const causalSessionIds = new Set<string>();

  for (const record of recordsForEpoch) {
    causalSessionIds.add(record.causalSessionId);
    if (record.continuedFromCausalSessionId !== null) {
      causalSessionIds.add(record.continuedFromCausalSessionId);
    }
    const contributorKey = buildRepoConcurrencyContributorKey({
      actorId: record.attribution.actor.actorId,
      attribution: record.attribution,
      causalSessionId: record.causalSessionId,
      transportSessionId: record.transportSessionId,
    });
    if (contributorKey !== null) {
      contributorKeys.add(contributorKey);
    }
    if (record.continuedFromCausalSessionId !== null) {
      contributorKeys.add(`causal:${record.continuedFromCausalSessionId}`);
    }
    if (record.attribution.actor.actorKind === "human" || record.attribution.actor.actorKind === "agent") {
      actorIds.add(record.attribution.actor.actorId);
    }
  }

  for (const event of eventsForEpoch) {
    if (event.causalSessionId !== null) {
      causalSessionIds.add(event.causalSessionId);
    }
    const contributorKey = buildRepoConcurrencyContributorKey({
      actorId: event.actorId,
      attribution: event.attribution,
      causalSessionId: event.causalSessionId,
      transportSessionId: event.transportSessionId,
    });
    if (contributorKey !== null) {
      contributorKeys.add(contributorKey);
    }
    if (event.attribution.actor.actorKind === "human" || event.attribution.actor.actorKind === "agent") {
      actorIds.add(event.attribution.actor.actorId);
    }
  }

  return {
    worktreeId: state.worktreeId,
    active: state.activeRecordId !== null,
    checkoutEpochId,
    causalSessionIds: [...causalSessionIds],
    actorIds: [...actorIds],
    contributorKeys: [...contributorKeys],
    explicitHandoff: recordsForEpoch.some((record) =>
      record.continuityEvidence.some((evidence: Evidence) =>
        evidence.evidenceKind === "explicit_handoff"
      )
    ),
    touches: buildRepoConcurrencyTouches(eventsForEpoch),
  };
}
