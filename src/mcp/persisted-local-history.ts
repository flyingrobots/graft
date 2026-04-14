import * as crypto from "node:crypto";
import * as path from "node:path";
import { z } from "zod";
import {
  actorSchema,
  attributionSummarySchema,
  attributionConfidenceSchema,
  causalFootprintSchema,
  causalRegionSchema,
  readEventSchema,
  stageEventSchema,
  transitionEventSchema,
  evidenceSchema,
  getMaximumConfidenceForEvidence,
  localHistoryContinuityOperationSchema,
  type AttributionSummary,
  type AttributionConfidence,
  type Actor,
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
  type PersistedLocalHistoryGraphContext,
  writeCausalEventToGraph,
  writeContinuityRecordToGraph,
} from "./persisted-local-history-graph.js";
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

const MAX_CONTINUITY_RECORDS = 128;
const MAX_READ_EVENTS = 256;
const MAX_STAGE_EVENTS = 128;
const MAX_TRANSITION_EVENTS = 128;

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

export interface PersistedLocalHistorySharedAttachSource {
  readonly sourceSessionId: string;
  readonly causalSessionId: string;
  readonly strandId: string;
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
  readonly historyPath: string | null;
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

export interface PersistedLocalActivityContinuityItem {
  readonly itemKind: "continuity";
  readonly recordId: string;
  readonly operation: LocalHistoryContinuityOperation;
  readonly occurredAt: string;
  readonly causalSessionId: string;
  readonly strandId: string;
  readonly attribution: AttributionSummary;
  readonly continuedFromCausalSessionId: string | null;
  readonly continuedFromStrandId: string | null;
}

export type PersistedLocalActivityItem =
  | PersistedLocalActivityContinuityItem
  | Extract<CausalEvent, { eventKind: "read" | "stage" | "transition" }>;

export interface PersistedLocalActivityWindow {
  readonly historyPath: string | null;
  readonly limit: number;
  readonly totalMatchingItems: number;
  readonly truncated: boolean;
  readonly items: readonly PersistedLocalActivityItem[];
}

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
  if (state.records.at(-1)?.recordId === record.recordId) {
    state.activeRecordId = activeAfter ? record.recordId : null;
    return;
  }
  state.records = [...state.records, record].slice(-MAX_CONTINUITY_RECORDS);
  state.activeRecordId = activeAfter ? record.recordId : null;
}

function keepRecent<T>(items: readonly T[], limit: number): T[] {
  return items.slice(-limit);
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

function compareByOccurredAtThenId(
  left: { readonly occurredAt: string; readonly id: string },
  right: { readonly occurredAt: string; readonly id: string },
): number {
  const byTime = left.occurredAt.localeCompare(right.occurredAt);
  if (byTime !== 0) {
    return byTime;
  }
  return left.id.localeCompare(right.id);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }
  return asString(value);
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const strings: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string" || entry.length === 0) {
      return undefined;
    }
    strings.push(entry);
  }
  return strings;
}

function asUnknownRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

interface ObservedLocalHistoryNode {
  readonly id: string;
  readonly props: Record<string, unknown>;
}

interface ObservedLocalHistoryEdge {
  readonly from: string;
  readonly to: string;
  readonly label: string;
}

interface ObservedLocalHistoryGraphSnapshot {
  readonly nodesById: ReadonlyMap<string, ObservedLocalHistoryNode>;
  readonly outgoingEdges: ReadonlyMap<string, readonly ObservedLocalHistoryEdge[]>;
}

const LOCAL_HISTORY_GRAPH_MATCH = ["lh:*"] as const;
const LOCAL_HISTORY_GRAPH_EXPOSE = [
  "actorId",
  "actorKind",
  "authority",
  "authorityScope",
  "attributionBasis",
  "attributionConfidence",
  "capturedAt",
  "causalSessionId",
  "checkoutEpochId",
  "continuityKey",
  "continuityOperation",
  "continuedFromCausalSessionId",
  "continuedFromEventId",
  "continuedFromStrandId",
  "details",
  "displayName",
  "entityKind",
  "eventId",
  "eventKind",
  "evidenceId",
  "evidenceKind",
  "fromRef",
  "occurredAt",
  "path",
  "paths",
  "phase",
  "projection",
  "reason",
  "repoId",
  "selectionKind",
  "semanticKind",
  "source",
  "sourceLayer",
  "startLine",
  "endLine",
  "strandId",
  "strength",
  "summary",
  "surface",
  "symbols",
  "targetId",
  "toRef",
  "transitionKind",
  "transportSessionId",
  "workspaceOverlayId",
  "workspaceSliceId",
  "worktreeId",
  "createdCheckoutEpochId",
] as const;

function sortEvidence(evidence: readonly Evidence[]): Evidence[] {
  return [...evidence].sort((left, right) => {
    const byCapturedAt = left.capturedAt.localeCompare(right.capturedAt);
    if (byCapturedAt !== 0) {
      return byCapturedAt;
    }
    return left.evidenceId.localeCompare(right.evidenceId);
  });
}

function sortEvents<T extends { readonly occurredAt: string; readonly eventId: string }>(events: readonly T[]): T[] {
  return [...events].sort((left, right) => compareByOccurredAtThenId(
    { occurredAt: left.occurredAt, id: left.eventId },
    { occurredAt: right.occurredAt, id: right.eventId },
  ));
}

function sortContinuityRecords(records: readonly ContinuityRecord[]): ContinuityRecord[] {
  return [...records].sort((left, right) => {
    const byTime = left.occurredAt.localeCompare(right.occurredAt);
    if (byTime !== 0) {
      return byTime;
    }
    if (left.continuedFromRecordId === right.recordId) {
      return 1;
    }
    if (right.continuedFromRecordId === left.recordId) {
      return -1;
    }
    if (left.operation !== right.operation) {
      if (left.operation === "park") {
        return -1;
      }
      if (right.operation === "park") {
        return 1;
      }
    }
    return left.recordId.localeCompare(right.recordId);
  });
}

function outgoingTargets(
  snapshot: ObservedLocalHistoryGraphSnapshot,
  nodeId: string,
  label: string,
): string[] {
  return (snapshot.outgoingEdges.get(nodeId) ?? [])
    .filter((edge) => edge.label === label)
    .map((edge) => edge.to);
}

function buildUnknownAttributionForActorId(actorId: string | null | undefined): AttributionSummary {
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

async function loadObservedLocalHistoryGraph(
  graph: PersistedLocalHistoryGraphContext | null | undefined,
): Promise<ObservedLocalHistoryGraphSnapshot | null> {
  if (graph === null || graph === undefined || typeof graph.warp.observer !== "function") {
    return null;
  }

  const observer = await graph.warp.observer({
    match: [...LOCAL_HISTORY_GRAPH_MATCH],
    expose: [...LOCAL_HISTORY_GRAPH_EXPOSE],
  });
  const nodeIds = await observer.getNodes();
  if (nodeIds.length === 0) {
    return null;
  }

  const nodesById = new Map<string, ObservedLocalHistoryNode>();
  for (const nodeId of nodeIds) {
    const props = await observer.getNodeProps(nodeId);
    const record = asUnknownRecord(props);
    if (record !== undefined) {
      nodesById.set(nodeId, { id: nodeId, props: record });
    }
  }

  if (nodesById.size === 0) {
    return null;
  }

  const outgoing = new Map<string, ObservedLocalHistoryEdge[]>();
  for (const edge of await observer.getEdges()) {
    if (!nodesById.has(edge.from) || !nodesById.has(edge.to)) {
      continue;
    }
    const bucket = outgoing.get(edge.from) ?? [];
    bucket.push(edge);
    outgoing.set(edge.from, bucket);
  }

  return {
    nodesById,
    outgoingEdges: outgoing,
  };
}

function readEvidenceNode(
  snapshot: ObservedLocalHistoryGraphSnapshot,
  nodeId: string,
): Evidence | null {
  const node = snapshot.nodesById.get(nodeId);
  if (node === undefined || asString(node.props["entityKind"]) !== "evidence") {
    return null;
  }
  const parsed = evidenceSchema.safeParse({
    evidenceId: asString(node.props["evidenceId"]),
    evidenceKind: asString(node.props["evidenceKind"]),
    source: asString(node.props["source"]),
    capturedAt: asString(node.props["capturedAt"]),
    strength: asString(node.props["strength"]),
    details: asUnknownRecord(node.props["details"]) ?? {},
  });
  return parsed.success ? parsed.data : null;
}

function readActorNode(
  snapshot: ObservedLocalHistoryGraphSnapshot,
  nodeId: string,
): Actor | null {
  const node = snapshot.nodesById.get(nodeId);
  if (node === undefined || asString(node.props["entityKind"]) !== "actor") {
    return null;
  }
  const parsed = actorSchema.safeParse({
    actorId: asString(node.props["actorId"]),
    actorKind: asString(node.props["actorKind"]),
    displayName: asString(node.props["displayName"]),
    source: asString(node.props["source"]),
    authorityScope: asString(node.props["authorityScope"]),
  });
  return parsed.success ? parsed.data : null;
}

function readFootprint(
  snapshot: ObservedLocalHistoryGraphSnapshot,
  eventNodeId: string,
): CausalFootprint {
  const footprintNodeId = outgoingTargets(snapshot, eventNodeId, "has_footprint")[0];
  const footprintNode = footprintNodeId === undefined ? undefined : snapshot.nodesById.get(footprintNodeId);
  const regions = (footprintNodeId === undefined ? [] : outgoingTargets(snapshot, footprintNodeId, "has_region"))
    .map((regionNodeId) => {
      const regionNode = snapshot.nodesById.get(regionNodeId);
      if (regionNode === undefined) {
        return null;
      }
      const parsed = causalRegionSchema.safeParse({
        path: asString(regionNode.props["path"]),
        startLine: regionNode.props["startLine"],
        endLine: regionNode.props["endLine"],
      });
      return parsed.success ? parsed.data : null;
    })
    .filter((region): region is z.infer<typeof causalRegionSchema> => region !== null);

  const parsed = causalFootprintSchema.safeParse({
    paths: footprintNode === undefined ? [] : asStringArray(footprintNode.props["paths"]) ?? [],
    symbols: footprintNode === undefined ? [] : asStringArray(footprintNode.props["symbols"]) ?? [],
    regions,
  });
  if (parsed.success) {
    return parsed.data;
  }
  return {
    paths: [],
    symbols: [],
    regions: [],
  };
}

function readSupportedEvidence(
  snapshot: ObservedLocalHistoryGraphSnapshot,
  eventNodeId: string,
): Evidence[] {
  return sortEvidence(
    outgoingTargets(snapshot, eventNodeId, "supported_by")
      .map((nodeId) => readEvidenceNode(snapshot, nodeId))
      .filter((evidence): evidence is Evidence => evidence !== null),
  );
}

function readEventAttribution(
  snapshot: ObservedLocalHistoryGraphSnapshot,
  eventNode: ObservedLocalHistoryNode,
  input: {
    readonly continuityOperation?: LocalHistoryContinuityOperation | undefined;
    readonly evidence: readonly Evidence[];
  },
): AttributionSummary {
  if (input.continuityOperation !== undefined) {
    return deriveContinuityAttribution(input.continuityOperation, input.evidence);
  }

  const actorNodeId = outgoingTargets(snapshot, eventNode.id, "attributed_to")[0];
  const actor = actorNodeId === undefined ? null : readActorNode(snapshot, actorNodeId);
  const parsed = attributionSummarySchema.safeParse({
    actor: actor ?? buildUnknownAttributionForActorId(asString(eventNode.props["actorId"])).actor,
    confidence: asString(eventNode.props["attributionConfidence"]) ?? "unknown",
    basis: asString(eventNode.props["attributionBasis"]) ?? "unknown_fallback",
    evidence: [...input.evidence],
  });
  return parsed.success ? parsed.data : buildUnknownAttributionForActorId(asString(eventNode.props["actorId"]));
}

function readContinuityRecordFromGraph(
  snapshot: ObservedLocalHistoryGraphSnapshot,
  node: ObservedLocalHistoryNode,
): ContinuityRecord | null {
  if (
    asString(node.props["entityKind"]) !== "local_history_event" ||
    asString(node.props["eventKind"]) !== "continuity"
  ) {
    return null;
  }
  const operation = localHistoryContinuityOperationSchema.safeParse(asString(node.props["continuityOperation"]));
  const repoId = asString(node.props["repoId"]);
  const worktreeId = asString(node.props["worktreeId"]);
  const recordId = asString(node.props["eventId"]);
  const occurredAt = asString(node.props["occurredAt"]);
  const continuityEvidence = readSupportedEvidence(snapshot, node.id);
  if (!operation.success || repoId === undefined || worktreeId === undefined || recordId === undefined || occurredAt === undefined) {
    return null;
  }
  const parsed = continuityRecordSchema.safeParse({
    recordId,
    continuityKey: asString(node.props["continuityKey"]) ?? buildContinuityKey(repoId, worktreeId),
    operation: operation.data,
    repoId,
    worktreeId,
    transportSessionId: asString(node.props["transportSessionId"]),
    workspaceSliceId: asString(node.props["workspaceSliceId"]),
    causalSessionId: asString(node.props["causalSessionId"]),
    strandId: asString(node.props["strandId"]),
    checkoutEpochId: asString(node.props["checkoutEpochId"]),
    workspaceOverlayId: asNullableString(node.props["workspaceOverlayId"]) ?? null,
    occurredAt,
    continuedFromRecordId: asNullableString(node.props["continuedFromEventId"]) ?? null,
    continuedFromCausalSessionId: asNullableString(node.props["continuedFromCausalSessionId"]) ?? null,
    continuedFromStrandId: asNullableString(node.props["continuedFromStrandId"]) ?? null,
    continuityConfidence: asString(node.props["attributionConfidence"]) ?? "unknown",
    continuityEvidence,
    attribution: readEventAttribution(snapshot, node, {
      continuityOperation: operation.data,
      evidence: continuityEvidence,
    }),
  });
  return parsed.success ? parsed.data : null;
}

function readReadEventFromGraph(
  snapshot: ObservedLocalHistoryGraphSnapshot,
  node: ObservedLocalHistoryNode,
): Extract<CausalEvent, { eventKind: "read" }> | null {
  if (asString(node.props["entityKind"]) !== "local_history_event" || asString(node.props["eventKind"]) !== "read") {
    return null;
  }
  const evidence = readSupportedEvidence(snapshot, node.id);
  const parsed = readEventSchema.safeParse({
    eventId: asString(node.props["eventId"]),
    eventKind: "read",
    repoId: asString(node.props["repoId"]),
    worktreeId: asString(node.props["worktreeId"]),
    checkoutEpochId: asString(node.props["checkoutEpochId"]),
    workspaceOverlayId: asNullableString(node.props["workspaceOverlayId"]) ?? null,
    transportSessionId: asString(node.props["transportSessionId"]),
    workspaceSliceId: asString(node.props["workspaceSliceId"]),
    causalSessionId: asString(node.props["causalSessionId"]),
    strandId: asString(node.props["strandId"]),
    actorId: asString(node.props["actorId"]) ?? "unknown",
    confidence: asString(node.props["attributionConfidence"]) ?? "unknown",
    evidenceIds: evidence.map((item) => item.evidenceId),
    attribution: readEventAttribution(snapshot, node, { evidence }),
    footprint: readFootprint(snapshot, node.id),
    occurredAt: asString(node.props["occurredAt"]),
    payload: {
      surface: asString(node.props["surface"]),
      projection: asString(node.props["projection"]),
      sourceLayer: asString(node.props["sourceLayer"]),
      reason: asString(node.props["reason"]),
    },
  });
  return parsed.success ? parsed.data : null;
}

function readStageEventFromGraph(
  snapshot: ObservedLocalHistoryGraphSnapshot,
  node: ObservedLocalHistoryNode,
): Extract<CausalEvent, { eventKind: "stage" }> | null {
  if (asString(node.props["entityKind"]) !== "local_history_event" || asString(node.props["eventKind"]) !== "stage") {
    return null;
  }
  const evidence = readSupportedEvidence(snapshot, node.id);
  const footprint = readFootprint(snapshot, node.id);
  const parsed = stageEventSchema.safeParse({
    eventId: asString(node.props["eventId"]),
    eventKind: "stage",
    repoId: asString(node.props["repoId"]),
    worktreeId: asString(node.props["worktreeId"]),
    checkoutEpochId: asString(node.props["checkoutEpochId"]),
    workspaceOverlayId: asNullableString(node.props["workspaceOverlayId"]) ?? null,
    transportSessionId: asString(node.props["transportSessionId"]),
    workspaceSliceId: asString(node.props["workspaceSliceId"]),
    causalSessionId: asString(node.props["causalSessionId"]),
    strandId: asString(node.props["strandId"]),
    actorId: asString(node.props["actorId"]) ?? "unknown",
    confidence: asString(node.props["attributionConfidence"]) ?? "unknown",
    evidenceIds: evidence.map((item) => item.evidenceId),
    attribution: readEventAttribution(snapshot, node, { evidence }),
    footprint,
    occurredAt: asString(node.props["occurredAt"]),
    payload: {
      targetId: asString(node.props["targetId"]),
      footprint,
      selectionKind: asString(node.props["selectionKind"]),
    },
  });
  return parsed.success ? parsed.data : null;
}

function readTransitionEventFromGraph(
  snapshot: ObservedLocalHistoryGraphSnapshot,
  node: ObservedLocalHistoryNode,
): Extract<CausalEvent, { eventKind: "transition" }> | null {
  if (
    asString(node.props["entityKind"]) !== "local_history_event" ||
    asString(node.props["eventKind"]) !== "transition"
  ) {
    return null;
  }
  const evidence = readSupportedEvidence(snapshot, node.id);
  const parsed = transitionEventSchema.safeParse({
    eventId: asString(node.props["eventId"]),
    eventKind: "transition",
    repoId: asString(node.props["repoId"]),
    worktreeId: asString(node.props["worktreeId"]),
    checkoutEpochId: asString(node.props["checkoutEpochId"]),
    workspaceOverlayId: asNullableString(node.props["workspaceOverlayId"]) ?? null,
    transportSessionId: asString(node.props["transportSessionId"]),
    workspaceSliceId: asString(node.props["workspaceSliceId"]),
    causalSessionId: asString(node.props["causalSessionId"]),
    strandId: asString(node.props["strandId"]),
    actorId: asString(node.props["actorId"]) ?? "unknown",
    confidence: asString(node.props["attributionConfidence"]) ?? "unknown",
    evidenceIds: evidence.map((item) => item.evidenceId),
    attribution: readEventAttribution(snapshot, node, { evidence }),
    footprint: readFootprint(snapshot, node.id),
    occurredAt: asString(node.props["occurredAt"]),
    payload: {
      semanticKind: asString(node.props["semanticKind"]),
      authority: asString(node.props["authority"]),
      phase: asNullableString(node.props["phase"]) ?? null,
      summary: asString(node.props["summary"]),
      transitionKind: asNullableString(node.props["transitionKind"]) ?? null,
      fromRef: asNullableString(node.props["fromRef"]) ?? null,
      toRef: asNullableString(node.props["toRef"]) ?? null,
      createdCheckoutEpochId: asNullableString(node.props["createdCheckoutEpochId"]) ?? null,
    },
  });
  return parsed.success ? parsed.data : null;
}

function loadStateFromGraphSnapshot(
  snapshot: ObservedLocalHistoryGraphSnapshot,
  repoId: string,
  worktreeId: string,
): ContinuityState | null {
  const continuityRecords = sortContinuityRecords(
    [...snapshot.nodesById.values()]
      .map((node) => readContinuityRecordFromGraph(snapshot, node))
      .filter((record): record is ContinuityRecord =>
        record !== null && record.repoId === repoId && record.worktreeId === worktreeId
      ),
  );

  const readEvents = sortEvents(
    [...snapshot.nodesById.values()]
      .map((node) => readReadEventFromGraph(snapshot, node))
      .filter((event): event is Extract<CausalEvent, { eventKind: "read" }> =>
        event !== null && event.repoId === repoId && event.worktreeId === worktreeId
      ),
  );
  const stageEvents = sortEvents(
    [...snapshot.nodesById.values()]
      .map((node) => readStageEventFromGraph(snapshot, node))
      .filter((event): event is Extract<CausalEvent, { eventKind: "stage" }> =>
        event !== null && event.repoId === repoId && event.worktreeId === worktreeId
      ),
  );
  const transitionEvents = sortEvents(
    [...snapshot.nodesById.values()]
      .map((node) => readTransitionEventFromGraph(snapshot, node))
      .filter((event): event is Extract<CausalEvent, { eventKind: "transition" }> =>
        event !== null && event.repoId === repoId && event.worktreeId === worktreeId
      ),
  );

  if (
    continuityRecords.length === 0 &&
    readEvents.length === 0 &&
    stageEvents.length === 0 &&
    transitionEvents.length === 0
  ) {
    return null;
  }

  const lastRecord = continuityRecords.at(-1) ?? null;
  return {
    continuityKey: lastRecord?.continuityKey ?? buildContinuityKey(repoId, worktreeId),
    repoId,
    worktreeId,
    activeRecordId: lastRecord === null || lastRecord.operation === "park" ? null : lastRecord.recordId,
    records: continuityRecords,
    readEvents,
    stageEvents,
    transitionEvents,
  };
}

async function loadStateFromGraph(
  graph: PersistedLocalHistoryGraphContext | null | undefined,
  repoId: string,
  worktreeId: string,
): Promise<ContinuityState | null> {
  const snapshot = await loadObservedLocalHistoryGraph(graph);
  if (snapshot === null) {
    return null;
  }
  return loadStateFromGraphSnapshot(snapshot, repoId, worktreeId);
}

async function loadStatesForRepoFromGraph(
  graph: PersistedLocalHistoryGraphContext | null | undefined,
  repoId: string,
): Promise<ContinuityState[] | null> {
  const snapshot = await loadObservedLocalHistoryGraph(graph);
  if (snapshot === null) {
    return null;
  }

  const worktreeIds = new Set(
    [...snapshot.nodesById.values()]
      .filter((node) => asString(node.props["repoId"]) === repoId)
      .map((node) => asString(node.props["worktreeId"]))
      .filter((value): value is string => value !== undefined),
  );

  const states = [...worktreeIds]
    .map((worktreeId) => loadStateFromGraphSnapshot(snapshot, repoId, worktreeId))
    .filter((state): state is ContinuityState => state !== null);

  return states.length > 0 ? states : null;
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
    readonly currentGraph?: PersistedLocalHistoryGraphContext | null;
    readonly previousGraph?: PersistedLocalHistoryGraphContext | null;
  }): Promise<void> {
    const previous = input.previous ?? null;
    const currentKey = buildContinuityKey(input.current.repoId, input.current.worktreeId);

    if (previous !== null) {
      const previousKey = buildContinuityKey(previous.repoId, previous.worktreeId);
      if (previousKey !== currentKey) {
        const previousState = await this.loadState(previousKey, previous.repoId, previous.worktreeId);
        const previousActive = findRecord(previousState, previousState.activeRecordId);
        if (previousActive !== null) {
          const parkRecord = this.createRecord("park", previousKey, previous, previousActive);
          const previousEventId = findLatestEventIdForStrand(previousState, previous.strandId);
          appendRecord(
            previousState,
            parkRecord,
            false,
          );
          await this.saveState(previousState);
          if (input.previousGraph !== null && input.previousGraph !== undefined) {
            await writeContinuityRecordToGraph(input.previousGraph, {
              record: parkRecord,
              previousEventId,
            });
          }
        }
      }
    }

    const currentState = await this.loadState(currentKey, input.current.repoId, input.current.worktreeId);
    const previousCurrentActive = findRecord(currentState, currentState.activeRecordId);
    let latestCurrentEventId = findLatestEventIdForStrand(currentState, input.current.strandId);
    if (previousCurrentActive !== null) {
      const parkRecord = this.createRecord("park", currentKey, input.current, previousCurrentActive);
      appendRecord(
        currentState,
        parkRecord,
        false,
      );
      if (parkRecord.strandId === input.current.strandId) {
        latestCurrentEventId = parkRecord.recordId;
      }
      if (input.currentGraph !== null && input.currentGraph !== undefined) {
        await this.saveState(currentState);
        await writeContinuityRecordToGraph(input.currentGraph, {
          record: parkRecord,
          previousEventId: findLatestEventIdForStrand(
            {
              ...currentState,
              records: currentState.records.slice(0, -1),
            },
            input.current.strandId,
          ),
        });
      }
    }

    const operation = this.classifyOperation(previousCurrentActive, input.current);
    const currentRecord = this.createRecord(operation, currentKey, input.current, previousCurrentActive);
    appendRecord(
      currentState,
      currentRecord,
      true,
    );
    await this.saveState(currentState);
    if (input.currentGraph !== null && input.currentGraph !== undefined) {
      await writeContinuityRecordToGraph(input.currentGraph, {
        record: currentRecord,
        previousEventId: latestCurrentEventId,
      });
    }
  }

  async noteCheckoutBoundary(input: {
    readonly previous: PersistedLocalHistoryContext;
    readonly current: PersistedLocalHistoryContext;
    readonly graph?: PersistedLocalHistoryGraphContext | null;
  }): Promise<void> {
    const continuityKey = buildContinuityKey(input.current.repoId, input.current.worktreeId);
    const state = await this.loadState(continuityKey, input.current.repoId, input.current.worktreeId);
    const activeRecord = findRecord(state, state.activeRecordId);
    const baseRecord = activeRecord ?? state.records.at(-1) ?? null;
    if (baseRecord === null) {
      const startRecord = this.createRecord("start", continuityKey, input.current, null);
      appendRecord(
        state,
        startRecord,
        true,
      );
      await this.saveState(state);
      if (input.graph !== null && input.graph !== undefined) {
        await writeContinuityRecordToGraph(input.graph, {
          record: startRecord,
          previousEventId: null,
        });
      }
      return;
    }
    if (baseRecord.checkoutEpochId === input.current.checkoutEpochId) {
      return;
    }

    const transitionEvidence = this.buildGitTransitionEvidence("fork", input.current);
    const parkPreviousEventId = findLatestEventIdForStrand(state, input.previous.strandId);
    const parkRecord = this.createRecord(
      "park",
      continuityKey,
      { ...input.previous, observedAt: input.current.observedAt },
      baseRecord,
      transitionEvidence,
    );
    appendRecord(
      state,
      parkRecord,
      false,
    );
    const forkRecord = this.createRecord("fork", continuityKey, input.current, baseRecord, transitionEvidence);
    appendRecord(
      state,
      forkRecord,
      true,
    );
    await this.saveState(state);
    if (input.graph !== null && input.graph !== undefined) {
      await writeContinuityRecordToGraph(input.graph, {
        record: parkRecord,
        previousEventId: parkPreviousEventId,
      });
      await writeContinuityRecordToGraph(input.graph, {
        record: forkRecord,
        previousEventId: null,
      });
    }
  }

  async summarize(
    status: WorkspaceStatus,
    causalContext: RuntimeCausalContext,
    graph?: PersistedLocalHistoryGraphContext | null,
  ): Promise<PersistedLocalHistorySummary> {
    if (status.repoId === null || status.worktreeId === null) {
      return this.emptySummary();
    }

    const continuityKey = buildContinuityKey(status.repoId, status.worktreeId);
    const graphState = await loadStateFromGraph(graph, status.repoId, status.worktreeId);
    const state = graphState ?? await this.loadState(continuityKey, status.repoId, status.worktreeId);
    return this.summarizeState(state, status, causalContext, graphState !== null ? null : this.historyPathFor(continuityKey));
  }

  async summarizeRepoConcurrency(
    status: WorkspaceStatus,
    graph?: PersistedLocalHistoryGraphContext | null,
  ): Promise<RepoConcurrencySummary | null> {
    if (status.repoId === null || status.worktreeId === null) {
      return null;
    }

    const continuityKey = buildContinuityKey(status.repoId, status.worktreeId);
    const graphStates = await loadStatesForRepoFromGraph(graph, status.repoId);
    const currentState = graphStates?.find((state) => state.worktreeId === status.worktreeId)
      ?? await this.loadState(continuityKey, status.repoId, status.worktreeId);
    const repoStates = graphStates ?? await this.loadStatesForRepo(status.repoId);

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

  async listRecentActivity(
    status: WorkspaceStatus,
    causalContext: RuntimeCausalContext,
    limit: number,
    graph?: PersistedLocalHistoryGraphContext | null,
  ): Promise<PersistedLocalActivityWindow> {
    if (status.repoId === null || status.worktreeId === null || status.graftDir === null) {
      return {
        historyPath: null,
        limit,
        totalMatchingItems: 0,
        truncated: false,
        items: [],
      };
    }

    const continuityKey = buildContinuityKey(status.repoId, status.worktreeId);
    const graphState = await loadStateFromGraph(graph, status.repoId, status.worktreeId);
    const state = graphState ?? await this.loadState(continuityKey, status.repoId, status.worktreeId);
    return this.buildActivityWindowFromState(
      state,
      causalContext,
      limit,
      graphState !== null ? null : this.historyPathFor(continuityKey),
    );
  }

  async declareAttach(input: {
    readonly current: PersistedLocalHistoryContext;
    readonly declaration: PersistedLocalHistoryAttachDeclaration;
    readonly graph?: PersistedLocalHistoryGraphContext | null;
  }): Promise<void> {
    const continuityKey = buildContinuityKey(input.current.repoId, input.current.worktreeId);
    const state = await this.loadState(continuityKey, input.current.repoId, input.current.worktreeId);
    const activeRecord = findRecord(state, state.activeRecordId);
    const baseRecord = activeRecord ?? state.records.at(-1) ?? null;
    if (baseRecord?.continuedFromRecordId === null || baseRecord === null) {
      throw new PersistedLocalHistoryAttachUnavailableError();
    }

    const attachRecord = this.createRecord(
      "attach",
      continuityKey,
      input.current,
      baseRecord,
      this.buildAttachDeclarationEvidence(input.current, input.declaration),
    );
    appendRecord(
      state,
      attachRecord,
      true,
    );
    await this.saveState(state);
    if (input.graph !== null && input.graph !== undefined) {
      await writeContinuityRecordToGraph(input.graph, {
        record: attachRecord,
        previousEventId: findLatestEventIdForStrand(
          {
            ...state,
            records: state.records.slice(0, -1),
          },
          input.current.strandId,
        ),
      });
    }
  }

  async declareSharedAttach(input: {
    readonly current: PersistedLocalHistoryContext;
    readonly declaration: PersistedLocalHistoryAttachDeclaration;
    readonly source: PersistedLocalHistorySharedAttachSource;
    readonly graph?: PersistedLocalHistoryGraphContext | null;
  }): Promise<void> {
    const continuityKey = buildContinuityKey(input.current.repoId, input.current.worktreeId);
    const state = await this.loadState(continuityKey, input.current.repoId, input.current.worktreeId);
    const baseRecord = findRecord(state, state.activeRecordId) ?? state.records.at(-1) ?? null;
    if (baseRecord === null) {
      throw new PersistedLocalHistoryAttachUnavailableError();
    }

    const attachRecord = this.createRecord(
      "attach",
      continuityKey,
      input.current,
      baseRecord,
      [
        ...this.buildAttachDeclarationEvidence(input.current, input.declaration),
        {
          evidenceId: buildEvidenceId("attach", "daemon_session_observation", input.current, 400),
          evidenceKind: "daemon_session_observation",
          source: "daemon_control_plane.shared_attach",
          capturedAt: input.current.observedAt,
          strength: "strong",
          details: {
            sourceSessionId: input.source.sourceSessionId,
            sourceCausalSessionId: input.source.causalSessionId,
            sourceStrandId: input.source.strandId,
            handoffKind: "cross_session_same_worktree",
          },
        },
      ],
      {
        continuedFromCausalSessionId: input.source.causalSessionId,
        continuedFromStrandId: input.source.strandId,
      },
    );
    appendRecord(
      state,
      attachRecord,
      true,
    );
    await this.saveState(state);
    if (input.graph !== null && input.graph !== undefined) {
      await writeContinuityRecordToGraph(input.graph, {
        record: attachRecord,
        previousEventId: findLatestEventIdForStrand(
          {
            ...state,
            records: state.records.slice(0, -1),
          },
          input.current.strandId,
        ),
      });
    }
  }

  async noteStageObservation(input: {
    readonly current: PersistedLocalHistoryContext;
    readonly stagedTarget: RuntimeStagedTargetFullFile;
    readonly attribution: AttributionSummary;
    readonly graph?: PersistedLocalHistoryGraphContext | null;
  }): Promise<void> {
    const continuityKey = buildContinuityKey(input.current.repoId, input.current.worktreeId);
    const state = await this.loadState(continuityKey, input.current.repoId, input.current.worktreeId);
    const event = this.createStageEvent(input.current, input.stagedTarget, input.attribution);
    if (state.stageEvents.at(-1)?.eventId === event.eventId) {
      return;
    }
    const previousEventId = findLatestEventIdForStrand(state, input.current.strandId);
    state.stageEvents = keepRecent([...state.stageEvents, event], MAX_STAGE_EVENTS);
    await this.saveState(state);
    if (input.graph !== null && input.graph !== undefined) {
      await writeCausalEventToGraph(input.graph, {
        event,
        previousEventId,
        stagedTarget: input.stagedTarget,
      });
    }
  }

  async noteReadObservation(input: {
    readonly current: PersistedLocalHistoryContext;
    readonly attribution: AttributionSummary;
    readonly surface: string;
    readonly projection: string;
    readonly sourceLayer: SourceLayer;
    readonly reason: string;
    readonly footprint: CausalFootprint;
    readonly graph?: PersistedLocalHistoryGraphContext | null;
  }): Promise<void> {
    const continuityKey = buildContinuityKey(input.current.repoId, input.current.worktreeId);
    const state = await this.loadState(continuityKey, input.current.repoId, input.current.worktreeId);
    const event = this.createReadEvent(input);
    if (state.readEvents.at(-1)?.eventId === event.eventId) {
      return;
    }
    const previousEventId = findLatestEventIdForStrand(state, input.current.strandId);
    state.readEvents = keepRecent([...state.readEvents, event], MAX_READ_EVENTS);
    await this.saveState(state);
    if (input.graph !== null && input.graph !== undefined) {
      await writeCausalEventToGraph(input.graph, {
        event,
        previousEventId,
      });
    }
  }

  async noteSemanticTransitionObservation(input: {
    readonly current: PersistedLocalHistoryContext;
    readonly semanticTransition: NonNullable<RepoObservation["semanticTransition"]>;
    readonly transition: RepoObservation["lastTransition"];
    readonly attribution: AttributionSummary;
    readonly graph?: PersistedLocalHistoryGraphContext | null;
  }): Promise<void> {
    const continuityKey = buildContinuityKey(input.current.repoId, input.current.worktreeId);
    const state = await this.loadState(continuityKey, input.current.repoId, input.current.worktreeId);
    const event = this.createTransitionEvent(input);
    if (state.transitionEvents.at(-1)?.eventId === event.eventId) {
      return;
    }
    const previousEventId = findLatestEventIdForStrand(state, input.current.strandId);
    state.transitionEvents = keepRecent([...state.transitionEvents, event], MAX_TRANSITION_EVENTS);
    await this.saveState(state);
    if (input.graph !== null && input.graph !== undefined) {
      await writeCausalEventToGraph(input.graph, {
        event,
        previousEventId,
      });
    }
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
    overrides: {
      readonly continuedFromCausalSessionId?: string | null;
      readonly continuedFromStrandId?: string | null;
    } = {},
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
      continuedFromCausalSessionId: overrides.continuedFromCausalSessionId ?? previous?.causalSessionId ?? null,
      continuedFromStrandId: overrides.continuedFromStrandId ?? previous?.strandId ?? null,
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
    return deriveContinuityAttribution(operation, continuityEvidence);
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

  private summarizeState(
    state: ContinuityState,
    status: WorkspaceStatus,
    causalContext: RuntimeCausalContext,
    historyPath: string | null,
  ): PersistedLocalHistorySummary {
    const activeRecord = findRecord(state, state.activeRecordId);
    const lastRecord = state.records.at(-1) ?? null;
    if (lastRecord === null || status.graftDir === null) {
      return this.emptySummary();
    }

    const effectiveRecord = activeRecord ?? lastRecord;
    return {
      availability: "present",
      persistence: "persisted_local_history",
      historyPath,
      totalContinuityRecords: state.records.length,
      active: activeRecord !== null,
      lastOperation: lastRecord.operation,
      lastObservedAt: lastRecord.occurredAt,
      continuityKey: state.continuityKey,
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

  private buildActivityWindowFromState(
    state: ContinuityState,
    causalContext: RuntimeCausalContext,
    limit: number,
    historyPath: string | null,
  ): PersistedLocalActivityWindow {
    const activeRecord = findRecord(state, state.activeRecordId);
    const effectiveCheckoutEpochId =
      activeRecord?.checkoutEpochId
      ?? state.records.at(-1)?.checkoutEpochId
      ?? causalContext.checkoutEpochId;

    const continuityItems: PersistedLocalActivityContinuityItem[] = state.records
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
      ...state.readEvents,
      ...state.stageEvents,
      ...state.transitionEvents,
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
      historyPath,
      limit,
      totalMatchingItems: allItems.length,
      truncated: allItems.length > limit,
      items: allItems.slice(0, limit),
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
          evidence.evidenceKind === "explicit_handoff"
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

function findLatestEventIdForStrand(state: ContinuityState, strandId: string): string | null {
  const items: {
    readonly id: string;
    readonly occurredAt: string;
    readonly priority: number;
    readonly sequence: number;
  }[] = [];

  for (const [index, record] of state.records.entries()) {
    if (record.strandId === strandId) {
      items.push({
        id: record.recordId,
        occurredAt: record.occurredAt,
        priority: 0,
        sequence: index,
      });
    }
  }
  for (const [index, event] of state.readEvents.entries()) {
    if (event.strandId === strandId) {
      items.push({
        id: event.eventId,
        occurredAt: event.occurredAt,
        priority: 1,
        sequence: index,
      });
    }
  }
  for (const [index, event] of state.stageEvents.entries()) {
    if (event.strandId === strandId) {
      items.push({
        id: event.eventId,
        occurredAt: event.occurredAt,
        priority: 2,
        sequence: index,
      });
    }
  }
  for (const [index, event] of state.transitionEvents.entries()) {
    if (event.strandId === strandId) {
      items.push({
        id: event.eventId,
        occurredAt: event.occurredAt,
        priority: 3,
        sequence: index,
      });
    }
  }

  items.sort((left, right) => {
    const byTime = left.occurredAt.localeCompare(right.occurredAt);
    if (byTime !== 0) {
      return byTime;
    }
    const byPriority = left.priority - right.priority;
    if (byPriority !== 0) {
      return byPriority;
    }
    const bySequence = left.sequence - right.sequence;
    if (bySequence !== 0) {
      return bySequence;
    }
    return left.id.localeCompare(right.id);
  });

  return items.at(-1)?.id ?? null;
}
