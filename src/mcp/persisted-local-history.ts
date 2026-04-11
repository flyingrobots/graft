import * as crypto from "node:crypto";
import * as path from "node:path";
import { z } from "zod";
import {
  attributionSummarySchema,
  attributionConfidenceSchema,
  readEventSchema,
  stageEventSchema,
  transitionEventSchema,
  evidenceSchema,
  getMaximumConfidenceForEvidence,
  localHistoryContinuityOperationSchema,
  type AttributionSummary,
  type AttributionConfidence,
  type CausalFootprint,
  type CausalEvent,
  type Evidence,
  type LocalHistoryContinuityOperation,
  type SourceLayer,
} from "../contracts/causal-ontology.js";
import type { JsonCodec } from "../ports/codec.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { RepoObservation } from "./repo-state.js";
import {
  buildRepoConcurrencyContributorKey,
  buildRepoConcurrencyTouches,
  deriveRepoConcurrencySummary,
  type RepoConcurrencySummary,
  type RepoConcurrencyWorktreeHistory,
} from "./repo-concurrency.js";
import type { GitTransitionHookEvent } from "./runtime-workspace-overlay.js";
import type { RuntimeCausalContext } from "./runtime-causal-context.js";
import type { RuntimeStagedTargetFullFile } from "./runtime-staged-target.js";
import type { WorkspaceStatus } from "./workspace-router.js";

const PERSISTED_LOCAL_HISTORY_PRESERVES = Object.freeze([
  "continuity_operations",
  "read_events",
  "stage_events",
  "transition_events",
  "runtime_context_ids",
  "workspace_overlay_snapshots",
] as const);

const PERSISTED_LOCAL_HISTORY_EXCLUDES = Object.freeze([
  "raw_chat_transcripts",
  "queue_bookkeeping",
  "canonical_provenance",
  "canonical_structural_truth",
] as const);

const continuityRecordSchema = z.object({
  recordId: z.string().min(1),
  continuityKey: z.string().min(1),
  operation: localHistoryContinuityOperationSchema,
  repoId: z.string().min(1),
  worktreeId: z.string().min(1),
  transportSessionId: z.string().min(1),
  workspaceSliceId: z.string().min(1),
  causalSessionId: z.string().min(1),
  strandId: z.string().min(1),
  checkoutEpochId: z.string().min(1),
  workspaceOverlayId: z.string().min(1).nullable(),
  occurredAt: z.string().min(1),
  continuedFromRecordId: z.string().min(1).nullable(),
  continuedFromCausalSessionId: z.string().min(1).nullable(),
  continuedFromStrandId: z.string().min(1).nullable(),
  continuityConfidence: attributionConfidenceSchema,
  continuityEvidence: z.array(evidenceSchema),
  attribution: attributionSummarySchema,
}).strict();

type ContinuityRecord = z.infer<typeof continuityRecordSchema>;

const continuityStateSchema = z.object({
  continuityKey: z.string().min(1),
  repoId: z.string().min(1),
  worktreeId: z.string().min(1),
  activeRecordId: z.string().min(1).nullable(),
  records: z.array(continuityRecordSchema),
  readEvents: z.array(readEventSchema),
  stageEvents: z.array(stageEventSchema),
  transitionEvents: z.array(transitionEventSchema),
}).strict();

type ContinuityState = z.infer<typeof continuityStateSchema>;

export interface PersistedLocalHistoryContext {
  readonly repoId: string;
  readonly worktreeId: string;
  readonly transportSessionId: string;
  readonly workspaceSliceId: string;
  readonly causalSessionId: string;
  readonly strandId: string;
  readonly checkoutEpochId: string;
  readonly workspaceOverlayId: string | null;
  readonly observedAt: string;
  readonly warpWriterId: string;
  readonly transitionKind: RepoObservation["lastTransition"] extends infer T
    ? T extends { kind: infer K } | null
      ? K | null
      : null
    : null;
  readonly transitionReflogSubject: string | null;
  readonly hookTransitionName: GitTransitionHookEvent["hookName"] | null;
  readonly hookTransitionArgs: readonly string[] | null;
  readonly hookTransitionObservedAt: string | null;
}

export interface PersistedLocalHistoryAttachDeclaration {
  readonly actorKind: "human" | "agent";
  readonly actorId?: string | undefined;
  readonly fromActorId?: string | undefined;
  readonly note?: string | undefined;
}

export interface PersistedLocalHistorySummaryNone {
  readonly availability: "none";
  readonly persistence: "persisted_local_history";
  readonly historyPath: null;
  readonly totalContinuityRecords: 0;
  readonly active: false;
  readonly lastOperation: null;
  readonly lastObservedAt: null;
  readonly continuityKey: null;
  readonly causalSessionId: null;
  readonly strandId: null;
  readonly checkoutEpochId: null;
  readonly continuedFromCausalSessionId: null;
  readonly continuityConfidence: AttributionConfidence;
  readonly continuityEvidence: readonly Evidence[];
  readonly attribution: AttributionSummary;
  readonly latestReadEvent: null;
  readonly latestStageEvent: null;
  readonly latestTransitionEvent: null;
  readonly preserves: readonly string[];
  readonly excludes: readonly string[];
  readonly nextAction: "bind_workspace_to_begin_local_history";
}

export interface PersistedLocalHistorySummaryPresent {
  readonly availability: "present";
  readonly persistence: "persisted_local_history";
  readonly historyPath: string;
  readonly totalContinuityRecords: number;
  readonly active: boolean;
  readonly lastOperation: LocalHistoryContinuityOperation;
  readonly lastObservedAt: string;
  readonly continuityKey: string;
  readonly causalSessionId: string;
  readonly strandId: string;
  readonly checkoutEpochId: string;
  readonly continuedFromCausalSessionId: string | null;
  readonly continuityConfidence: AttributionConfidence;
  readonly continuityEvidence: readonly Evidence[];
  readonly attribution: AttributionSummary;
  readonly latestReadEvent: Extract<CausalEvent, { eventKind: "read" }> | null;
  readonly latestStageEvent: Extract<CausalEvent, { eventKind: "stage" }> | null;
  readonly latestTransitionEvent: Extract<CausalEvent, { eventKind: "transition" }> | null;
  readonly preserves: readonly string[];
  readonly excludes: readonly string[];
  readonly nextAction:
    | "continue_active_causal_workspace"
    | "review_transition_boundary_before_continuing"
    | "inspect_or_resume_local_history";
}

export type PersistedLocalHistorySummary =
  | PersistedLocalHistorySummaryNone
  | PersistedLocalHistorySummaryPresent;

export type { RepoConcurrencySummary } from "./repo-concurrency.js";

export class PersistedLocalHistoryAttachUnavailableError extends Error {
  readonly code = "NO_ATTACHABLE_HISTORY";

  constructor(message = "No attachable persisted local-history lineage is available for the current footing.") {
    super(message);
    this.name = "PersistedLocalHistoryAttachUnavailableError";
  }
}

function stableId(prefix: string, input: string): string {
  return `${prefix}:${crypto.createHash("sha256").update(input).digest("hex").slice(0, 16)}`;
}

export function buildContinuityKey(repoId: string, worktreeId: string): string {
  return stableId("continuity", `${repoId}:${worktreeId}`);
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

function createEmptyState(continuityKey: string, repoId: string, worktreeId: string): ContinuityState {
  return {
    continuityKey,
    repoId,
    worktreeId,
    activeRecordId: null,
    records: [],
    readEvents: [],
    stageEvents: [],
    transitionEvents: [],
  };
}

function findRecord(state: ContinuityState, recordId: string | null): ContinuityRecord | null {
  if (recordId === null) return null;
  for (let index = state.records.length - 1; index >= 0; index--) {
    const record = state.records[index];
    if (record?.recordId === recordId) {
      return record;
    }
  }
  return null;
}

function appendRecord(state: ContinuityState, record: ContinuityRecord, activeAfter: boolean): void {
  state.records = [...state.records, record];
  state.activeRecordId = activeAfter ? record.recordId : null;
}

function buildUnknownAttribution(): AttributionSummary {
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

export class PersistedLocalHistoryStore {
  constructor(
    private readonly deps: {
      readonly fs: FileSystem;
      readonly codec: JsonCodec;
      readonly graftDir: string;
    },
  ) {}

  async noteBinding(input: {
    readonly current: PersistedLocalHistoryContext;
    readonly previous?: PersistedLocalHistoryContext | null;
  }): Promise<void> {
    const previous = input.previous ?? null;
    const currentKey = buildContinuityKey(input.current.repoId, input.current.worktreeId);

    if (previous !== null) {
      const previousKey = buildContinuityKey(previous.repoId, previous.worktreeId);
      if (previousKey !== currentKey) {
        const previousState = await this.loadState(previousKey, previous.repoId, previous.worktreeId);
        const previousActive = findRecord(previousState, previousState.activeRecordId);
        if (previousActive !== null) {
          appendRecord(
            previousState,
            this.createRecord("park", previousKey, previous, previousActive),
            false,
          );
          await this.saveState(previousState);
        }
      }
    }

    const currentState = await this.loadState(currentKey, input.current.repoId, input.current.worktreeId);
    const previousCurrentActive = findRecord(currentState, currentState.activeRecordId);
    if (previousCurrentActive !== null) {
      appendRecord(
        currentState,
        this.createRecord("park", currentKey, input.current, previousCurrentActive),
        false,
      );
    }

    const operation = this.classifyOperation(previousCurrentActive, input.current);
    appendRecord(
      currentState,
      this.createRecord(operation, currentKey, input.current, previousCurrentActive),
      true,
    );
    await this.saveState(currentState);
  }

  async noteCheckoutBoundary(input: {
    readonly previous: PersistedLocalHistoryContext;
    readonly current: PersistedLocalHistoryContext;
  }): Promise<void> {
    const continuityKey = buildContinuityKey(input.current.repoId, input.current.worktreeId);
    const state = await this.loadState(continuityKey, input.current.repoId, input.current.worktreeId);
    const activeRecord = findRecord(state, state.activeRecordId);
    const baseRecord = activeRecord ?? state.records.at(-1) ?? null;
    if (baseRecord === null) {
      appendRecord(
        state,
        this.createRecord("start", continuityKey, input.current, null),
        true,
      );
      await this.saveState(state);
      return;
    }
    if (baseRecord.checkoutEpochId === input.current.checkoutEpochId) {
      return;
    }

    const transitionEvidence = this.buildGitTransitionEvidence("fork", input.current);
    appendRecord(
      state,
      this.createRecord(
        "park",
        continuityKey,
        { ...input.previous, observedAt: input.current.observedAt },
        baseRecord,
        transitionEvidence,
      ),
      false,
    );
    appendRecord(
      state,
      this.createRecord("fork", continuityKey, input.current, baseRecord, transitionEvidence),
      true,
    );
    await this.saveState(state);
  }

  async summarize(status: WorkspaceStatus, causalContext: RuntimeCausalContext): Promise<PersistedLocalHistorySummary> {
    if (status.repoId === null || status.worktreeId === null) {
      return this.emptySummary();
    }

    const continuityKey = buildContinuityKey(status.repoId, status.worktreeId);
    const state = await this.loadState(continuityKey, status.repoId, status.worktreeId);
    const activeRecord = findRecord(state, state.activeRecordId);
    const lastRecord = state.records.at(-1) ?? null;
    if (lastRecord === null || status.graftDir === null) {
      return this.emptySummary();
    }

    const effectiveRecord = activeRecord ?? lastRecord;
    return {
      availability: "present",
      persistence: "persisted_local_history",
      historyPath: this.historyPathFor(continuityKey),
      totalContinuityRecords: state.records.length,
      active: activeRecord !== null,
      lastOperation: lastRecord.operation,
      lastObservedAt: lastRecord.occurredAt,
      continuityKey,
      causalSessionId: effectiveRecord.causalSessionId,
      strandId: effectiveRecord.strandId,
      checkoutEpochId: effectiveRecord.checkoutEpochId,
      continuedFromCausalSessionId: lastRecord.continuedFromCausalSessionId,
      continuityConfidence: lastRecord.continuityConfidence,
      continuityEvidence: lastRecord.continuityEvidence,
      attribution: effectiveRecord.attribution,
      latestReadEvent: state.readEvents.at(-1) ?? null,
      latestStageEvent: state.stageEvents.at(-1) ?? null,
      latestTransitionEvent: state.transitionEvents.at(-1) ?? null,
      preserves: PERSISTED_LOCAL_HISTORY_PRESERVES,
      excludes: PERSISTED_LOCAL_HISTORY_EXCLUDES,
      nextAction: activeRecord?.causalSessionId === causalContext.causalSessionId
        ? (lastRecord.operation === "fork"
            ? "review_transition_boundary_before_continuing"
            : "continue_active_causal_workspace")
        : "inspect_or_resume_local_history",
    };
  }

  async summarizeRepoConcurrency(status: WorkspaceStatus): Promise<RepoConcurrencySummary | null> {
    if (status.repoId === null || status.worktreeId === null) {
      return null;
    }

    const continuityKey = buildContinuityKey(status.repoId, status.worktreeId);
    const currentState = await this.loadState(continuityKey, status.repoId, status.worktreeId);
    const repoStates = await this.loadStatesForRepo(status.repoId);

    return deriveRepoConcurrencySummary({
      currentWorktreeId: status.worktreeId,
      histories: [
        this.toWorktreeHistory(currentState),
        ...repoStates
          .filter((state) => state.continuityKey !== currentState.continuityKey)
          .map((state) => this.toWorktreeHistory(state)),
      ],
    });
  }

  async declareAttach(input: {
    readonly current: PersistedLocalHistoryContext;
    readonly declaration: PersistedLocalHistoryAttachDeclaration;
  }): Promise<void> {
    const continuityKey = buildContinuityKey(input.current.repoId, input.current.worktreeId);
    const state = await this.loadState(continuityKey, input.current.repoId, input.current.worktreeId);
    const activeRecord = findRecord(state, state.activeRecordId);
    const baseRecord = activeRecord ?? state.records.at(-1) ?? null;
    if (baseRecord?.continuedFromRecordId === null || baseRecord === null) {
      throw new PersistedLocalHistoryAttachUnavailableError();
    }

    appendRecord(
      state,
      this.createRecord(
        "attach",
        continuityKey,
        input.current,
        baseRecord,
        this.buildAttachDeclarationEvidence(input.current, input.declaration),
      ),
      true,
    );
    await this.saveState(state);
  }

  async noteStageObservation(input: {
    readonly current: PersistedLocalHistoryContext;
    readonly stagedTarget: RuntimeStagedTargetFullFile;
    readonly attribution: AttributionSummary;
  }): Promise<void> {
    const continuityKey = buildContinuityKey(input.current.repoId, input.current.worktreeId);
    const state = await this.loadState(continuityKey, input.current.repoId, input.current.worktreeId);
    const event = this.createStageEvent(input.current, input.stagedTarget, input.attribution);
    if (state.stageEvents.at(-1)?.eventId === event.eventId) {
      return;
    }
    state.stageEvents = [...state.stageEvents, event];
    await this.saveState(state);
  }

  async noteReadObservation(input: {
    readonly current: PersistedLocalHistoryContext;
    readonly attribution: AttributionSummary;
    readonly surface: string;
    readonly projection: string;
    readonly sourceLayer: SourceLayer;
    readonly reason: string;
    readonly footprint: CausalFootprint;
  }): Promise<void> {
    const continuityKey = buildContinuityKey(input.current.repoId, input.current.worktreeId);
    const state = await this.loadState(continuityKey, input.current.repoId, input.current.worktreeId);
    state.readEvents = [...state.readEvents, this.createReadEvent(input)];
    await this.saveState(state);
  }

  async noteSemanticTransitionObservation(input: {
    readonly current: PersistedLocalHistoryContext;
    readonly semanticTransition: NonNullable<RepoObservation["semanticTransition"]>;
    readonly transition: RepoObservation["lastTransition"];
    readonly attribution: AttributionSummary;
  }): Promise<void> {
    const continuityKey = buildContinuityKey(input.current.repoId, input.current.worktreeId);
    const state = await this.loadState(continuityKey, input.current.repoId, input.current.worktreeId);
    const event = this.createTransitionEvent(input);
    if (state.transitionEvents.at(-1)?.eventId === event.eventId) {
      return;
    }
    state.transitionEvents = [...state.transitionEvents, event];
    await this.saveState(state);
  }

  buildContext(
    status: WorkspaceStatus,
    causalContext: RuntimeCausalContext,
    repoState: RepoObservation,
    hookEvent: GitTransitionHookEvent | null = null,
  ): PersistedLocalHistoryContext | null {
    if (status.repoId === null || status.worktreeId === null) {
      return null;
    }
    return {
      repoId: status.repoId,
      worktreeId: status.worktreeId,
      transportSessionId: causalContext.transportSessionId,
      workspaceSliceId: causalContext.workspaceSliceId,
      causalSessionId: causalContext.causalSessionId,
      strandId: causalContext.strandId,
      checkoutEpochId: causalContext.checkoutEpochId,
      workspaceOverlayId: repoState.workspaceOverlayId,
      observedAt: repoState.observedAt,
      warpWriterId: causalContext.warpWriterId,
      transitionKind: repoState.lastTransition?.kind ?? null,
      transitionReflogSubject: repoState.lastTransition?.evidence.reflogSubject ?? null,
      hookTransitionName: hookEvent?.hookName ?? null,
      hookTransitionArgs: hookEvent?.hookArgs ?? null,
      hookTransitionObservedAt: hookEvent?.observedAt ?? null,
    };
  }

  private classifyOperation(
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

  private createRecord(
    operation: LocalHistoryContinuityOperation,
    continuityKey: string,
    context: PersistedLocalHistoryContext,
    previous: ContinuityRecord | null,
    additionalEvidence: readonly Evidence[] = [],
  ): ContinuityRecord {
    const continuityEvidence = [
      ...this.buildContinuityEvidence(operation, context, previous),
      ...additionalEvidence,
    ];
    return {
      recordId: buildRecordId(
        continuityKey,
        operation,
        context,
        previous?.recordId ?? null,
        additionalEvidence.map((evidence) => evidence.evidenceId),
      ),
      continuityKey,
      operation,
      repoId: context.repoId,
      worktreeId: context.worktreeId,
      transportSessionId: context.transportSessionId,
      workspaceSliceId: context.workspaceSliceId,
      causalSessionId: context.causalSessionId,
      strandId: context.strandId,
      checkoutEpochId: context.checkoutEpochId,
      workspaceOverlayId: context.workspaceOverlayId,
      occurredAt: context.observedAt,
      continuedFromRecordId: previous?.recordId ?? null,
      continuedFromCausalSessionId: previous?.causalSessionId ?? null,
      continuedFromStrandId: previous?.strandId ?? null,
      continuityConfidence: getMaximumConfidenceForEvidence(
        continuityEvidence.map((evidence) => evidence.strength),
      ),
      continuityEvidence,
      attribution: this.deriveAttribution(operation, continuityEvidence),
    };
  }

  private buildContinuityEvidence(
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

  private buildGitTransitionEvidence(
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

  private buildAttachDeclarationEvidence(
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

  private deriveAttribution(
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

  private emptySummary(): PersistedLocalHistorySummaryNone {
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
      preserves: PERSISTED_LOCAL_HISTORY_PRESERVES,
      excludes: PERSISTED_LOCAL_HISTORY_EXCLUDES,
      nextAction: "bind_workspace_to_begin_local_history",
    };
  }

  private createStageEvent(
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

  private createReadEvent(input: {
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

  private createTransitionEvent(input: {
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

  private historyPathFor(continuityKey: string): string {
    return path.join(this.deps.graftDir, "local-history", `${continuityKey}.json`);
  }

  private async loadStatesForRepo(repoId: string): Promise<ContinuityState[]> {
    const historyDir = path.join(this.deps.graftDir, "local-history");
    let filenames: string[];
    try {
      filenames = await this.deps.fs.readdir(historyDir);
    } catch {
      return [];
    }

    const states: ContinuityState[] = [];
    for (const filename of filenames) {
      if (!filename.endsWith(".json")) {
        continue;
      }
      try {
        const raw = await this.deps.fs.readFile(path.join(historyDir, filename), "utf-8");
        const state = continuityStateSchema.parse(this.deps.codec.decode(raw));
        if (state.repoId === repoId) {
          states.push(state);
        }
      } catch {
        // Ignore malformed local-history artifacts.
      }
    }

    return states;
  }

  private toWorktreeHistory(state: ContinuityState): RepoConcurrencyWorktreeHistory {
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
        record.continuityEvidence.some((evidence) =>
          evidence.evidenceKind === "explicit_handoff" ||
          evidence.evidenceKind === "explicit_user_declaration" ||
          evidence.evidenceKind === "explicit_agent_declaration"
        )
      ),
      touches: buildRepoConcurrencyTouches(eventsForEpoch),
    };
  }

  private async loadState(
    continuityKey: string,
    repoId: string,
    worktreeId: string,
  ): Promise<ContinuityState> {
    try {
      const raw = await this.deps.fs.readFile(this.historyPathFor(continuityKey), "utf-8");
      return continuityStateSchema.parse(this.deps.codec.decode(raw));
    } catch {
      return createEmptyState(continuityKey, repoId, worktreeId);
    }
  }

  private async saveState(state: ContinuityState): Promise<void> {
    const filePath = this.historyPathFor(state.continuityKey);
    await this.deps.fs.mkdir(path.dirname(filePath), { recursive: true });
    await this.deps.fs.writeFile(filePath, this.deps.codec.encode(state), "utf-8");
  }
}
