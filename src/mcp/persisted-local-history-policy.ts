import * as crypto from "node:crypto";
import {
  getMaximumConfidenceForEvidence,
  type AttributionSummary,
  type CausalEvent,
  type CausalFootprint,
  type Evidence,
  type LocalHistoryContinuityOperation,
  type SourceLayer,
} from "../contracts/causal-ontology.js";
import type { RepoObservation } from "./repo-state.js";
import type { RuntimeStagedTargetFullFile } from "./runtime-staged-target.js";
import type {
  ContinuityRecord,
  PersistedLocalHistoryAttachDeclaration,
  PersistedLocalHistoryContext,
} from "./persisted-local-history.js";
import { buildUnknownAttribution } from "./persisted-local-history-views.js";

function stableId(prefix: string, input: string): string {
  return `${prefix}:${crypto.createHash("sha256").update(input).digest("hex").slice(0, 16)}`;
}

function buildRecordId(
  continuityKey: string,
  operation: LocalHistoryContinuityOperation,
  context: PersistedLocalHistoryContext,
  previousRecordId: string | null,
  additionalEvidenceIds: readonly string[],
): string {
  return stableId(
    "history",
    JSON.stringify({
      continuityKey,
      operation,
      occurredAt: context.observedAt,
      causalSessionId: context.causalSessionId,
      strandId: context.strandId,
      workspaceSliceId: context.workspaceSliceId,
      previousRecordId,
      additionalEvidenceIds,
    }),
  );
}

function buildEvidenceId(
  operation: LocalHistoryContinuityOperation,
  kind: Evidence["evidenceKind"],
  context: PersistedLocalHistoryContext,
  index: number,
): string {
  return stableId(
    "evidence",
    JSON.stringify({
      operation,
      kind,
      index,
      occurredAt: context.observedAt,
      transportSessionId: context.transportSessionId,
      causalSessionId: context.causalSessionId,
      strandId: context.strandId,
    }),
  );
}

export function buildUnknownAttributionForActorId(actorId: string | null | undefined): AttributionSummary {
  const unknown = buildUnknownAttribution();
  if (actorId === null || actorId === undefined || actorId.length === 0) {
    return unknown;
  }
  return {
    ...unknown,
    actor: {
      ...unknown.actor,
      actorId,
    },
  };
}

export function deriveContinuityAttribution(
  operation: LocalHistoryContinuityOperation,
  continuityEvidence: readonly Evidence[],
): AttributionSummary {
  const explicitUserEvidence = continuityEvidence.filter((evidence) => evidence.evidenceKind === "explicit_user_declaration");
  const explicitAgentEvidence = continuityEvidence.filter((evidence) => evidence.evidenceKind === "explicit_agent_declaration");

  if (explicitUserEvidence.length > 0 && explicitAgentEvidence.length > 0) {
    return {
      actor: {
        actorId: "unknown",
        actorKind: "unknown",
        displayName: "Conflicting actor signals",
        source: "persisted_local_history.conflict",
        authorityScope: "mixed",
      },
      confidence: "unknown",
      basis: "conflicting_signals",
      evidence: [...continuityEvidence],
    };
  }

  if (explicitUserEvidence.length > 0 || explicitAgentEvidence.length > 0) {
    const declarationEvidence = explicitUserEvidence.length > 0 ? explicitUserEvidence : explicitAgentEvidence;
    const primary = declarationEvidence[0];
    const actorKind = explicitUserEvidence.length > 0 ? "human" : "agent";
    const actorId = typeof primary?.details["actorId"] === "string" && primary.details["actorId"].length > 0
      ? primary.details["actorId"]
      : `${actorKind}:declared`;
    return {
      actor: {
        actorId,
        actorKind,
        displayName: actorKind === "human" ? "Declared human actor" : "Declared agent actor",
        source: "causal_attach.declaration",
        authorityScope: "declared",
      },
      confidence: getMaximumConfidenceForEvidence(
        declarationEvidence.map((evidence) => evidence.strength),
      ),
      basis: "explicit_declaration",
      evidence: continuityEvidence.filter((evidence) =>
        evidence.evidenceKind === "explicit_user_declaration" ||
        evidence.evidenceKind === "explicit_agent_declaration" ||
        evidence.evidenceKind === "explicit_handoff"
      ),
    };
  }

  const gitEvidence = continuityEvidence.filter((evidence) =>
    evidence.evidenceKind === "git_transition_observation" ||
    evidence.evidenceKind === "git_hook_transition"
  );
  if (gitEvidence.length > 0 && (operation === "fork" || operation === "park")) {
    return {
      actor: {
        actorId: "git:transition",
        actorKind: "git",
        displayName: "Git transition",
        source: "persisted_local_history.checkout_transition",
        authorityScope: "inferred",
      },
      confidence: getMaximumConfidenceForEvidence(
        gitEvidence.map((evidence) => evidence.strength),
      ),
      basis: "git_transition",
      evidence: gitEvidence,
    };
  }

  return buildUnknownAttribution();
}

export function classifyContinuityOperation(
  previous: ContinuityRecord | null,
  current: PersistedLocalHistoryContext,
): LocalHistoryContinuityOperation {
  if (previous === null) {
    return "start";
  }
  if (previous.transportSessionId === current.transportSessionId) {
    return "resume";
  }
  if (previous.checkoutEpochId === current.checkoutEpochId) {
    return "attach";
  }
  return "fork";
}

function buildContinuityEvidence(
  operation: LocalHistoryContinuityOperation,
  context: PersistedLocalHistoryContext,
  previous: ContinuityRecord | null,
): Evidence[] {
  const evidence: Evidence[] = [];

  evidence.push({
    evidenceId: buildEvidenceId(operation, "mcp_transport_binding", context, evidence.length),
    evidenceKind: "mcp_transport_binding",
    source: "persisted_local_history.transport_binding",
    capturedAt: context.observedAt,
    strength: operation === "start" || operation === "resume" ? "direct" : "strong",
    details: {
      operation,
      transportSessionId: context.transportSessionId,
      workspaceSliceId: context.workspaceSliceId,
    },
  });

  evidence.push({
    evidenceId: buildEvidenceId(operation, "worktree_fs_observation", context, evidence.length),
    evidenceKind: "worktree_fs_observation",
    source: "persisted_local_history.workspace_footing",
    capturedAt: context.observedAt,
    strength: "strong",
    details: {
      repoId: context.repoId,
      worktreeId: context.worktreeId,
      checkoutEpochId: context.checkoutEpochId,
      workspaceOverlayId: context.workspaceOverlayId,
      previousCheckoutEpochId: previous?.checkoutEpochId ?? null,
      previousCausalSessionId: previous?.causalSessionId ?? null,
    },
  });

  evidence.push({
    evidenceId: buildEvidenceId(operation, "writer_lane_identity", context, evidence.length),
    evidenceKind: "writer_lane_identity",
    source: "persisted_local_history.writer_lane",
    capturedAt: context.observedAt,
    strength: "strong",
    details: {
      warpWriterId: context.warpWriterId,
      causalSessionId: context.causalSessionId,
      strandId: context.strandId,
    },
  });

  return evidence;
}

export function buildGitTransitionEvidence(
  operation: LocalHistoryContinuityOperation,
  context: PersistedLocalHistoryContext,
): Evidence[] {
  const evidence: Evidence[] = [];

  if (context.transitionKind !== null) {
    evidence.push({
      evidenceId: buildEvidenceId(operation, "git_transition_observation", context, 500),
      evidenceKind: "git_transition_observation",
      source: "persisted_local_history.checkout_transition",
      capturedAt: context.observedAt,
      strength: "strong",
      details: {
        operation,
        transitionKind: context.transitionKind,
        reflogSubject: context.transitionReflogSubject,
      },
    });
  }

  if (context.hookTransitionName !== null) {
    evidence.push({
      evidenceId: buildEvidenceId(operation, "git_hook_transition", context, 501),
      evidenceKind: "git_hook_transition",
      source: "persisted_local_history.checkout_transition_hook",
      capturedAt: context.hookTransitionObservedAt ?? context.observedAt,
      strength: "direct",
      details: {
        operation,
        hookName: context.hookTransitionName,
        hookArgs: context.hookTransitionArgs,
      },
    });
  }

  return evidence;
}

export function buildAttachDeclarationEvidence(
  context: PersistedLocalHistoryContext,
  declaration: PersistedLocalHistoryAttachDeclaration,
): Evidence[] {
  const evidence: Evidence[] = [];
  const declarationKind = declaration.actorKind === "human"
    ? "explicit_user_declaration"
    : "explicit_agent_declaration";

  evidence.push({
    evidenceId: buildEvidenceId("attach", declarationKind, context, evidence.length + 100),
    evidenceKind: declarationKind,
    source: "causal_attach.declaration",
    capturedAt: context.observedAt,
    strength: "direct",
    details: {
      actorKind: declaration.actorKind,
      actorId: declaration.actorId ?? null,
      note: declaration.note ?? null,
    },
  });

  if (declaration.fromActorId !== undefined) {
    evidence.push({
      evidenceId: buildEvidenceId("attach", "explicit_handoff", context, evidence.length + 100),
      evidenceKind: "explicit_handoff",
      source: "causal_attach.handoff",
      capturedAt: context.observedAt,
      strength: "direct",
      details: {
        actorKind: declaration.actorKind,
        actorId: declaration.actorId ?? null,
        fromActorId: declaration.fromActorId,
        note: declaration.note ?? null,
      },
    });
  }

  return evidence;
}

export function createContinuityRecord(input: {
  readonly operation: LocalHistoryContinuityOperation;
  readonly continuityKey: string;
  readonly context: PersistedLocalHistoryContext;
  readonly previous: ContinuityRecord | null;
  readonly additionalEvidence?: readonly Evidence[];
  readonly overrides?: {
    readonly continuedFromCausalSessionId?: string | null;
    readonly continuedFromStrandId?: string | null;
  };
}): ContinuityRecord {
  const additionalEvidence = input.additionalEvidence ?? [];
  const continuityEvidence = [
    ...buildContinuityEvidence(input.operation, input.context, input.previous),
    ...additionalEvidence,
  ];

  return {
    recordId: buildRecordId(
      input.continuityKey,
      input.operation,
      input.context,
      input.previous?.recordId ?? null,
      additionalEvidence.map((evidence) => evidence.evidenceId),
    ),
    continuityKey: input.continuityKey,
    operation: input.operation,
    repoId: input.context.repoId,
    worktreeId: input.context.worktreeId,
    transportSessionId: input.context.transportSessionId,
    workspaceSliceId: input.context.workspaceSliceId,
    causalSessionId: input.context.causalSessionId,
    strandId: input.context.strandId,
    checkoutEpochId: input.context.checkoutEpochId,
    workspaceOverlayId: input.context.workspaceOverlayId,
    occurredAt: input.context.observedAt,
    continuedFromRecordId: input.previous?.recordId ?? null,
    continuedFromCausalSessionId: input.overrides?.continuedFromCausalSessionId ?? input.previous?.causalSessionId ?? null,
    continuedFromStrandId: input.overrides?.continuedFromStrandId ?? input.previous?.strandId ?? null,
    continuityConfidence: getMaximumConfidenceForEvidence(
      continuityEvidence.map((evidence) => evidence.strength),
    ),
    continuityEvidence,
    attribution: deriveContinuityAttribution(input.operation, continuityEvidence),
  };
}

export function createStageEvent(
  context: PersistedLocalHistoryContext,
  stagedTarget: RuntimeStagedTargetFullFile,
  attribution: AttributionSummary,
): Extract<CausalEvent, { eventKind: "stage" }> {
  const footprint = {
    paths: stagedTarget.target.selectionEntries.map((entry) => entry.path),
    symbols: stagedTarget.target.selectionEntries.flatMap((entry) => entry.symbols),
    regions: stagedTarget.target.selectionEntries.flatMap((entry) => entry.regions),
  };

  return {
    eventId: stableId(
      "event",
      JSON.stringify({
        eventKind: "stage",
        targetId: stagedTarget.target.targetId,
        actorId: attribution.actor.actorId,
        confidence: attribution.confidence,
        evidenceIds: attribution.evidence.map((evidence) => evidence.evidenceId),
      }),
    ),
    eventKind: "stage",
    repoId: context.repoId,
    worktreeId: context.worktreeId,
    checkoutEpochId: context.checkoutEpochId,
    workspaceOverlayId: context.workspaceOverlayId,
    transportSessionId: context.transportSessionId,
    workspaceSliceId: context.workspaceSliceId,
    causalSessionId: context.causalSessionId,
    strandId: context.strandId,
    actorId: attribution.actor.actorId,
    confidence: attribution.confidence,
    evidenceIds: attribution.evidence.map((evidence) => evidence.evidenceId),
    attribution,
    footprint,
    occurredAt: context.observedAt,
    payload: {
      targetId: stagedTarget.target.targetId,
      footprint,
      selectionKind: stagedTarget.target.selectionKind,
    },
  };
}

export function createReadEvent(input: {
  readonly current: PersistedLocalHistoryContext;
  readonly attribution: AttributionSummary;
  readonly surface: string;
  readonly projection: string;
  readonly sourceLayer: SourceLayer;
  readonly reason: string;
  readonly footprint: CausalFootprint;
}): Extract<CausalEvent, { eventKind: "read" }> {
  return {
    eventId: stableId(
      "event",
      JSON.stringify({
        eventKind: "read",
        occurredAt: input.current.observedAt,
        surface: input.surface,
        projection: input.projection,
        sourceLayer: input.sourceLayer,
        reason: input.reason,
        footprint: input.footprint,
        actorId: input.attribution.actor.actorId,
        confidence: input.attribution.confidence,
        evidenceIds: input.attribution.evidence.map((evidence) => evidence.evidenceId),
      }),
    ),
    eventKind: "read",
    repoId: input.current.repoId,
    worktreeId: input.current.worktreeId,
    checkoutEpochId: input.current.checkoutEpochId,
    workspaceOverlayId: input.current.workspaceOverlayId,
    transportSessionId: input.current.transportSessionId,
    workspaceSliceId: input.current.workspaceSliceId,
    causalSessionId: input.current.causalSessionId,
    strandId: input.current.strandId,
    actorId: input.attribution.actor.actorId,
    confidence: input.attribution.confidence,
    evidenceIds: input.attribution.evidence.map((evidence) => evidence.evidenceId),
    attribution: input.attribution,
    footprint: input.footprint,
    occurredAt: input.current.observedAt,
    payload: {
      surface: input.surface,
      projection: input.projection,
      sourceLayer: input.sourceLayer,
      reason: input.reason,
    },
  };
}

export function createTransitionEvent(input: {
  readonly current: PersistedLocalHistoryContext;
  readonly semanticTransition: NonNullable<RepoObservation["semanticTransition"]>;
  readonly transition: RepoObservation["lastTransition"];
  readonly attribution: AttributionSummary;
}): Extract<CausalEvent, { eventKind: "transition" }> {
  const transition = input.transition;
  const semanticTransition = input.semanticTransition;
  const footprint = {
    paths: [],
    symbols: [],
    regions: [],
  };

  return {
    eventId: stableId(
      "event",
      JSON.stringify({
        eventKind: "transition",
        checkoutEpochId: input.current.checkoutEpochId,
        workspaceOverlayId: input.current.workspaceOverlayId,
        semanticKind: semanticTransition.kind,
        authority: semanticTransition.authority,
        phase: semanticTransition.phase,
        summary: semanticTransition.summary,
        transitionKind: transition?.kind ?? null,
        fromRef: transition?.fromRef ?? null,
        toRef: transition?.toRef ?? null,
        actorId: input.attribution.actor.actorId,
        confidence: input.attribution.confidence,
        evidenceIds: input.attribution.evidence.map((evidence) => evidence.evidenceId),
      }),
    ),
    eventKind: "transition",
    repoId: input.current.repoId,
    worktreeId: input.current.worktreeId,
    checkoutEpochId: input.current.checkoutEpochId,
    workspaceOverlayId: input.current.workspaceOverlayId,
    transportSessionId: input.current.transportSessionId,
    workspaceSliceId: input.current.workspaceSliceId,
    causalSessionId: input.current.causalSessionId,
    strandId: input.current.strandId,
    actorId: input.attribution.actor.actorId,
    confidence: input.attribution.confidence,
    evidenceIds: input.attribution.evidence.map((evidence) => evidence.evidenceId),
    attribution: input.attribution,
    footprint,
    occurredAt: input.current.observedAt,
    payload: {
      semanticKind: semanticTransition.kind,
      authority: semanticTransition.authority,
      phase: semanticTransition.phase,
      summary: semanticTransition.summary,
      transitionKind: transition?.kind ?? null,
      fromRef: transition?.fromRef ?? null,
      toRef: transition?.toRef ?? null,
      createdCheckoutEpochId: transition !== null ? input.current.checkoutEpochId : null,
    },
  };
}
