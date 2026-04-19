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
  localHistoryContinuityOperationSchema,
  type AttributionSummary,
  type AttributionConfidence,
  type Actor,
  type CausalEvent,
  type CausalFootprint,
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
  deriveRepoConcurrencySummary,
  type RepoConcurrencySummary,
} from "./repo-concurrency.js";
import {
  buildPersistedLocalActivityWindow,
  emptyPersistedLocalActivityWindow,
  emptyPersistedLocalHistorySummary,
  findRecord,
  summarizeContinuityState,
  toRepoConcurrencyWorktreeHistory,
} from "./persisted-local-history-views.js";
import {
  buildAttachDeclarationEvidence,
  buildGitTransitionEvidence,
  buildUnknownAttributionForActorId,
  classifyContinuityOperation,
  createContinuityRecord,
  createReadEvent,
  createStageEvent,
  createTransitionEvent,
  deriveContinuityAttribution,
} from "./persisted-local-history-policy.js";
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

export type ContinuityRecord = z.infer<typeof continuityRecordSchema>;

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

export type ContinuityState = z.infer<typeof continuityStateSchema>;

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

async function loadObservedLocalHistoryGraph(
  graph: PersistedLocalHistoryGraphContext | null | undefined,
): Promise<ObservedLocalHistoryGraphSnapshot | null> {
  if (graph === null || graph === undefined) {
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

interface LegacyPersistedLocalHistoryArtifact {
  readonly filePath: string;
  readonly state: ContinuityState;
}

export interface PersistedLocalHistoryMigrationResult {
  graftDir: string;
  discoveredArtifacts: number;
  migratedArtifacts: number;
  malformedArtifacts: number;
  importedContinuityRecords: number;
  importedReadEvents: number;
  importedStageEvents: number;
  importedTransitionEvents: number;
  skippedContinuityRecords: number;
  skippedReadEvents: number;
  skippedStageEvents: number;
  skippedTransitionEvents: number;
}

async function loadLegacyPersistedLocalHistoryArtifacts(input: {
  readonly fs: FileSystem;
  readonly codec: JsonCodec;
  readonly graftDir: string;
}): Promise<{
  readonly artifacts: readonly LegacyPersistedLocalHistoryArtifact[];
  readonly malformedArtifacts: number;
}> {
  const historyDir = path.join(input.graftDir, "local-history");
  let filenames: string[];
  try {
    filenames = await input.fs.readdir(historyDir);
  } catch {
    return {
      artifacts: [],
      malformedArtifacts: 0,
    };
  }

  const artifacts: LegacyPersistedLocalHistoryArtifact[] = [];
  let malformedArtifacts = 0;

  for (const filename of filenames) {
    if (!filename.endsWith(".json")) {
      continue;
    }
    const filePath = path.join(historyDir, filename);
    try {
      const raw = await input.fs.readFile(filePath, "utf-8");
      const state = continuityStateSchema.parse(input.codec.decode(raw));
      artifacts.push({ filePath, state });
    } catch {
      malformedArtifacts += 1;
    }
  }

  return {
    artifacts,
    malformedArtifacts,
  };
}

function buildLegacyMigrationSequence(state: ContinuityState): {
  readonly kind: "continuity" | "read" | "stage" | "transition";
  readonly occurredAt: string;
  readonly sequence: number;
  readonly id: string;
  readonly record?: ContinuityRecord;
  readonly event?: Extract<CausalEvent, { eventKind: "read" | "stage" | "transition" }>;
}[] {
  const sequence = [
    ...state.records.map((record, sequenceIndex) => ({
      kind: "continuity" as const,
      occurredAt: record.occurredAt,
      sequence: sequenceIndex,
      id: record.recordId,
      record,
    })),
    ...state.readEvents.map((event, sequenceIndex) => ({
      kind: "read" as const,
      occurredAt: event.occurredAt,
      sequence: sequenceIndex,
      id: event.eventId,
      event,
    })),
    ...state.stageEvents.map((event, sequenceIndex) => ({
      kind: "stage" as const,
      occurredAt: event.occurredAt,
      sequence: sequenceIndex,
      id: event.eventId,
      event,
    })),
    ...state.transitionEvents.map((event, sequenceIndex) => ({
      kind: "transition" as const,
      occurredAt: event.occurredAt,
      sequence: sequenceIndex,
      id: event.eventId,
      event,
    })),
  ];

  const priority = { continuity: 0, read: 1, stage: 2, transition: 3 } as const;

  return sequence.sort((left, right) => {
    const byTime = left.occurredAt.localeCompare(right.occurredAt);
    if (byTime !== 0) {
      return byTime;
    }
    const byPriority = priority[left.kind] - priority[right.kind];
    if (byPriority !== 0) {
      return byPriority;
    }
    const bySequence = left.sequence - right.sequence;
    if (bySequence !== 0) {
      return bySequence;
    }
    return left.id.localeCompare(right.id);
  });
}

async function hasLocalHistoryEventNode(
  graph: PersistedLocalHistoryGraphContext,
  eventId: string,
): Promise<boolean> {
  return graph.warp.hasNode(`lh:event:${eventId}`);
}

export async function migrateLegacyPersistedLocalHistoryToGraph(input: {
  readonly fs: FileSystem;
  readonly codec: JsonCodec;
  readonly graftDir: string;
  readonly graph: PersistedLocalHistoryGraphContext;
}): Promise<PersistedLocalHistoryMigrationResult> {
  const { artifacts, malformedArtifacts } = await loadLegacyPersistedLocalHistoryArtifacts(input);
  const result: PersistedLocalHistoryMigrationResult = {
    graftDir: input.graftDir,
    discoveredArtifacts: artifacts.length,
    migratedArtifacts: 0,
    malformedArtifacts,
    importedContinuityRecords: 0,
    importedReadEvents: 0,
    importedStageEvents: 0,
    importedTransitionEvents: 0,
    skippedContinuityRecords: 0,
    skippedReadEvents: 0,
    skippedStageEvents: 0,
    skippedTransitionEvents: 0,
  };

  for (const artifact of artifacts) {
    const importedState = createEmptyState(
      artifact.state.continuityKey,
      artifact.state.repoId,
      artifact.state.worktreeId,
    );

    for (const item of buildLegacyMigrationSequence(artifact.state)) {
      if (item.kind === "continuity" && item.record !== undefined) {
        const previousEventId = findLatestEventIdForStrand(importedState, item.record.strandId);
        if (await hasLocalHistoryEventNode(input.graph, item.record.recordId)) {
          result.skippedContinuityRecords += 1;
        } else {
          await writeContinuityRecordToGraph(input.graph, {
            record: item.record,
            previousEventId,
          });
          result.importedContinuityRecords += 1;
        }
        importedState.records.push(item.record);
        if (artifact.state.activeRecordId === item.record.recordId) {
          importedState.activeRecordId = item.record.recordId;
        }
        continue;
      }

      if (item.event === undefined) {
        continue;
      }

      const previousEventId = item.event.strandId === null
        ? null
        : findLatestEventIdForStrand(importedState, item.event.strandId);
      if (await hasLocalHistoryEventNode(input.graph, item.event.eventId)) {
        if (item.kind === "read") result.skippedReadEvents += 1;
        if (item.kind === "stage") result.skippedStageEvents += 1;
        if (item.kind === "transition") result.skippedTransitionEvents += 1;
      } else {
        await writeCausalEventToGraph(input.graph, {
          event: item.event,
          previousEventId,
        });
        if (item.kind === "read") result.importedReadEvents += 1;
        if (item.kind === "stage") result.importedStageEvents += 1;
        if (item.kind === "transition") result.importedTransitionEvents += 1;
      }

      if (item.kind === "read") {
        importedState.readEvents.push(item.event as Extract<CausalEvent, { eventKind: "read" }>);
      } else if (item.kind === "stage") {
        importedState.stageEvents.push(item.event as Extract<CausalEvent, { eventKind: "stage" }>);
      } else {
        importedState.transitionEvents.push(item.event as Extract<CausalEvent, { eventKind: "transition" }>);
      }
    }

    result.migratedArtifacts += 1;
  }

  return result;
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

    if (previous !== null && input.previousGraph !== null && input.previousGraph !== undefined) {
      const previousKey = buildContinuityKey(previous.repoId, previous.worktreeId);
      if (previousKey !== currentKey) {
        const previousState = await this.loadWritableState(
          input.previousGraph,
          previousKey,
          previous.repoId,
          previous.worktreeId,
        );
        const previousActive = findRecord(previousState, previousState.activeRecordId);
        if (previousActive !== null) {
          const parkRecord = createContinuityRecord({
            operation: "park",
            continuityKey: previousKey,
            context: previous,
            previous: previousActive,
          });
          const previousEventId = findLatestEventIdForStrand(previousState, previous.strandId);
          appendRecord(
            previousState,
            parkRecord,
            false,
          );
          await writeContinuityRecordToGraph(input.previousGraph, {
            record: parkRecord,
            previousEventId,
          });
        }
      }
    }

    const currentState = await this.loadWritableState(
      input.currentGraph,
      currentKey,
      input.current.repoId,
      input.current.worktreeId,
    );
    const previousCurrentActive = findRecord(currentState, currentState.activeRecordId);
    let latestCurrentEventId = findLatestEventIdForStrand(currentState, input.current.strandId);
    if (previousCurrentActive !== null) {
      const parkRecord = createContinuityRecord({
        operation: "park",
        continuityKey: currentKey,
        context: input.current,
        previous: previousCurrentActive,
      });
      const parkPreviousEventId = latestCurrentEventId;
      appendRecord(
        currentState,
        parkRecord,
        false,
      );
      if (parkRecord.strandId === input.current.strandId) {
        latestCurrentEventId = parkRecord.recordId;
      }
      if (input.currentGraph !== null && input.currentGraph !== undefined) {
        await writeContinuityRecordToGraph(input.currentGraph, {
          record: parkRecord,
          previousEventId: parkPreviousEventId,
        });
      }
    }

    const operation = classifyContinuityOperation(previousCurrentActive, input.current);
    const currentRecord = createContinuityRecord({
      operation,
      continuityKey: currentKey,
      context: input.current,
      previous: previousCurrentActive,
    });
    appendRecord(
      currentState,
      currentRecord,
      true,
    );
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
    const state = await this.loadWritableState(
      input.graph,
      continuityKey,
      input.current.repoId,
      input.current.worktreeId,
    );
    const activeRecord = findRecord(state, state.activeRecordId);
    const baseRecord = activeRecord ?? state.records.at(-1) ?? null;
    if (baseRecord === null) {
      const startRecord = createContinuityRecord({
        operation: "start",
        continuityKey,
        context: input.current,
        previous: null,
      });
      appendRecord(
        state,
        startRecord,
        true,
      );
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

    const transitionEvidence = buildGitTransitionEvidence("fork", input.current);
    const parkPreviousEventId = findLatestEventIdForStrand(state, input.previous.strandId);
    const parkRecord = createContinuityRecord({
      operation: "park",
      continuityKey,
      context: { ...input.previous, observedAt: input.current.observedAt },
      previous: baseRecord,
      additionalEvidence: transitionEvidence,
    });
    appendRecord(
      state,
      parkRecord,
      false,
    );
    const forkRecord = createContinuityRecord({
      operation: "fork",
      continuityKey,
      context: input.current,
      previous: baseRecord,
      additionalEvidence: transitionEvidence,
    });
    appendRecord(
      state,
      forkRecord,
      true,
    );
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
      return emptyPersistedLocalHistorySummary({
        preserves: PERSISTED_LOCAL_HISTORY_PRESERVES,
        excludes: PERSISTED_LOCAL_HISTORY_EXCLUDES,
      });
    }

    const graphState = await loadStateFromGraph(graph, status.repoId, status.worktreeId);
    if (graphState === null) {
      return emptyPersistedLocalHistorySummary({
        preserves: PERSISTED_LOCAL_HISTORY_PRESERVES,
        excludes: PERSISTED_LOCAL_HISTORY_EXCLUDES,
      });
    }
    return summarizeContinuityState({
      state: graphState,
      causalContext,
      preserves: PERSISTED_LOCAL_HISTORY_PRESERVES,
      excludes: PERSISTED_LOCAL_HISTORY_EXCLUDES,
    });
  }

  async summarizeRepoConcurrency(
    status: WorkspaceStatus,
    graph?: PersistedLocalHistoryGraphContext | null,
  ): Promise<RepoConcurrencySummary | null> {
    if (status.repoId === null || status.worktreeId === null) {
      return null;
    }

    const currentState = await loadStateFromGraph(graph, status.repoId, status.worktreeId);
    if (currentState === null) {
      return null;
    }
    const graphStates = await loadStatesForRepoFromGraph(graph, status.repoId);
    const repoStates = graphStates ?? [currentState];

    return deriveRepoConcurrencySummary({
      currentWorktreeId: status.worktreeId,
      histories: [
        toRepoConcurrencyWorktreeHistory(currentState),
        ...repoStates
          .filter((state) => state.continuityKey !== currentState.continuityKey)
          .map((state) => toRepoConcurrencyWorktreeHistory(state)),
      ],
    });
  }

  async listRecentActivity(
    status: WorkspaceStatus,
    causalContext: RuntimeCausalContext,
    limit: number,
    graph?: PersistedLocalHistoryGraphContext | null,
  ): Promise<PersistedLocalActivityWindow> {
    if (status.repoId === null || status.worktreeId === null) {
      return emptyPersistedLocalActivityWindow(limit);
    }

    const graphState = await loadStateFromGraph(graph, status.repoId, status.worktreeId);
    if (graphState === null) {
      return emptyPersistedLocalActivityWindow(limit);
    }
    return buildPersistedLocalActivityWindow({
      state: graphState,
      causalContext,
      limit,
    });
  }

  async declareAttach(input: {
    readonly current: PersistedLocalHistoryContext;
    readonly declaration: PersistedLocalHistoryAttachDeclaration;
    readonly graph?: PersistedLocalHistoryGraphContext | null;
  }): Promise<void> {
    const continuityKey = buildContinuityKey(input.current.repoId, input.current.worktreeId);
    const state = await this.loadWritableState(
      input.graph,
      continuityKey,
      input.current.repoId,
      input.current.worktreeId,
    );
    const activeRecord = findRecord(state, state.activeRecordId);
    const baseRecord = activeRecord ?? state.records.at(-1) ?? null;
    if (baseRecord?.continuedFromRecordId === null || baseRecord === null) {
      throw new PersistedLocalHistoryAttachUnavailableError();
    }

    const attachRecord = createContinuityRecord({
      operation: "attach",
      continuityKey,
      context: input.current,
      previous: baseRecord,
      additionalEvidence: buildAttachDeclarationEvidence(input.current, input.declaration),
    });
    appendRecord(
      state,
      attachRecord,
      true,
    );
    if (input.graph !== null && input.graph !== undefined) {
      const previousEventId = findLatestEventIdForStrand(
        {
          ...state,
          records: state.records.slice(0, -1),
        },
        input.current.strandId,
      );
      await writeContinuityRecordToGraph(input.graph, {
        record: attachRecord,
        previousEventId,
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
    const state = await this.loadWritableState(
      input.graph,
      continuityKey,
      input.current.repoId,
      input.current.worktreeId,
    );
    const baseRecord = findRecord(state, state.activeRecordId) ?? state.records.at(-1) ?? null;
    if (baseRecord === null) {
      throw new PersistedLocalHistoryAttachUnavailableError();
    }

    const attachRecord = createContinuityRecord({
      operation: "attach",
      continuityKey,
      context: input.current,
      previous: baseRecord,
      additionalEvidence: [
        ...buildAttachDeclarationEvidence(input.current, input.declaration),
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
      overrides: {
        continuedFromCausalSessionId: input.source.causalSessionId,
        continuedFromStrandId: input.source.strandId,
      },
    });
    appendRecord(
      state,
      attachRecord,
      true,
    );
    if (input.graph !== null && input.graph !== undefined) {
      const previousEventId = findLatestEventIdForStrand(
        {
          ...state,
          records: state.records.slice(0, -1),
        },
        input.current.strandId,
      );
      await writeContinuityRecordToGraph(input.graph, {
        record: attachRecord,
        previousEventId,
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
    const state = await this.loadWritableState(
      input.graph,
      continuityKey,
      input.current.repoId,
      input.current.worktreeId,
    );
    const event = createStageEvent(input.current, input.stagedTarget, input.attribution);
    if (state.stageEvents.at(-1)?.eventId === event.eventId) {
      return;
    }
    const previousEventId = findLatestEventIdForStrand(state, input.current.strandId);
    state.stageEvents = keepRecent([...state.stageEvents, event], MAX_STAGE_EVENTS);
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
    const state = await this.loadWritableState(
      input.graph,
      continuityKey,
      input.current.repoId,
      input.current.worktreeId,
    );
    const event = createReadEvent(input);
    if (state.readEvents.at(-1)?.eventId === event.eventId) {
      return;
    }
    const previousEventId = findLatestEventIdForStrand(state, input.current.strandId);
    state.readEvents = keepRecent([...state.readEvents, event], MAX_READ_EVENTS);
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
    const state = await this.loadWritableState(
      input.graph,
      continuityKey,
      input.current.repoId,
      input.current.worktreeId,
    );
    const event = createTransitionEvent(input);
    if (state.transitionEvents.at(-1)?.eventId === event.eventId) {
      return;
    }
    const previousEventId = findLatestEventIdForStrand(state, input.current.strandId);
    state.transitionEvents = keepRecent([...state.transitionEvents, event], MAX_TRANSITION_EVENTS);
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

  private async loadWritableState(
    graph: PersistedLocalHistoryGraphContext | null | undefined,
    continuityKey: string,
    repoId: string,
    worktreeId: string,
  ): Promise<ContinuityState> {
    return await loadStateFromGraph(graph, repoId, worktreeId) ?? createEmptyState(continuityKey, repoId, worktreeId);
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
