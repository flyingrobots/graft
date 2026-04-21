import * as crypto from "node:crypto";
import type {
  AttributionSummary,
  CausalEvent,
  CausalFootprint,
  CausalRegion,
  Evidence,
} from "../contracts/causal-ontology.js";
import type { WarpContext } from "../warp/context.js";
import { patchGraph } from "../warp/context.js";
import type { RuntimeStagedTargetFullFile } from "./runtime-staged-target.js";

export type PersistedLocalHistoryGraphWarp = WarpContext;

export interface PersistedLocalHistoryGraphContext {
  readonly warp: PersistedLocalHistoryGraphWarp;
  readonly worktreeRoot: string;
}

export interface PersistedLocalHistoryGraphContinuityRecord {
  readonly recordId: string;
  readonly continuityKey: string;
  readonly operation: string;
  readonly repoId: string;
  readonly worktreeId: string;
  readonly transportSessionId: string;
  readonly workspaceSliceId: string;
  readonly causalSessionId: string;
  readonly strandId: string;
  readonly checkoutEpochId: string;
  readonly workspaceOverlayId: string | null;
  readonly occurredAt: string;
  readonly continuedFromRecordId: string | null;
  readonly continuedFromCausalSessionId: string | null;
  readonly continuedFromStrandId: string | null;
  readonly continuityConfidence: string;
  readonly continuityEvidence: readonly Evidence[];
  readonly attribution: AttributionSummary;
}

interface PatchAccumulator {
  ensureNode(id: string, props: Record<string, unknown>): void;
  addEdge(from: string, to: string, label: string): void;
  readonly nodes: ReadonlyMap<string, Readonly<Record<string, unknown>>>;
  readonly edges: readonly { from: string; to: string; label: string }[];
}

function stableHash(input: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 16);
}

function repoNodeId(repoId: string): string {
  return repoId;
}

function worktreeNodeId(worktreeId: string): string {
  return worktreeId;
}

function checkoutEpochNodeId(checkoutEpochId: string): string {
  return `lh:epoch:${checkoutEpochId}`;
}

function causalSessionNodeId(causalSessionId: string): string {
  return `lh:session:${causalSessionId}`;
}

function strandNodeId(strandId: string): string {
  return `lh:strand:${strandId}`;
}

function workspaceSliceNodeId(workspaceSliceId: string): string {
  return `lh:slice:${workspaceSliceId}`;
}

function actorNodeId(actorId: string): string {
  return `lh:actor:${actorId}`;
}

function workspaceOverlayNodeId(workspaceOverlayId: string): string {
  return `lh:overlay:${workspaceOverlayId}`;
}

function stagedTargetNodeId(targetId: string): string {
  return `lh:target:${targetId}`;
}

function evidenceNodeId(evidenceId: string): string {
  return `lh:evidence:${evidenceId}`;
}

function footprintNodeId(digest: string): string {
  return `lh:footprint:${digest}`;
}

function regionNodeId(digest: string): string {
  return `lh:region:${digest}`;
}

function localHistoryEventNodeId(eventId: string): string {
  return `lh:event:${eventId}`;
}

function fileNodeId(filePath: string): string {
  return `file:${filePath}`;
}

function symbolNodeId(filePath: string, symbol: string): string {
  return `sym:${filePath}:${symbol}`;
}

function deriveFootprintShape(footprint: CausalFootprint): "file_set" | "symbol_set" | "region_set" | "mixed" {
  const hasPaths = footprint.paths.length > 0;
  const hasSymbols = footprint.symbols.length > 0;
  const hasRegions = footprint.regions.length > 0;
  const shapeCount = Number(hasPaths) + Number(hasSymbols) + Number(hasRegions);
  if (shapeCount > 1) {
    return "mixed";
  }
  if (hasRegions) {
    return "region_set";
  }
  if (hasSymbols) {
    return "symbol_set";
  }
  return "file_set";
}

function digestFootprint(footprint: CausalFootprint): string {
  return stableHash(footprint);
}

function digestRegion(region: CausalRegion): string {
  return stableHash(region);
}

function createPatchAccumulator(): PatchAccumulator {
  const nodes = new Map<string, Record<string, unknown>>();
  const edges = new Map<string, { from: string; to: string; label: string }>();

  return {
    ensureNode(id: string, props: Record<string, unknown>): void {
      const existing = nodes.get(id) ?? {};
      nodes.set(id, { ...existing, ...props });
    },
    addEdge(from: string, to: string, label: string): void {
      edges.set(`${from}\u0000${label}\u0000${to}`, { from, to, label });
    },
    get nodes(): ReadonlyMap<string, Readonly<Record<string, unknown>>> {
      return nodes;
    },
    get edges(): readonly { from: string; to: string; label: string }[] {
      return [...edges.values()];
    },
  };
}

async function commitAccumulator(
  graph: PersistedLocalHistoryGraphContext,
  accumulator: PatchAccumulator,
): Promise<void> {
  const ids = [...accumulator.nodes.keys()];
  const existence = new Map<string, boolean>();
  for (const id of ids) {
    existence.set(id, await graph.warp.app.core().hasNode(id));
  }

  await patchGraph(graph.warp, (patch) => {
    for (const [id, props] of accumulator.nodes.entries()) {
      const exists = existence.get(id) ?? false;
      if (!exists) {
        patch.addNode(id);
      }
      if (!exists) {
        for (const [key, value] of Object.entries(props)) {
          patch.setProperty(id, key, value);
        }
      }
    }
    for (const edge of accumulator.edges) {
      patch.addEdge(edge.from, edge.to, edge.label);
    }
  });
}

function ensureAnchors(
  accumulator: PatchAccumulator,
  input: {
    readonly repoId: string;
    readonly worktreeId: string;
    readonly worktreeRoot: string;
    readonly checkoutEpochId: string | null;
    readonly causalSessionId: string | null;
    readonly strandId: string | null;
    readonly workspaceSliceId: string | null;
    readonly transportSessionId: string | null;
    readonly workspaceOverlayId: string | null;
    readonly occurredAt: string;
  },
): void {
  accumulator.ensureNode(repoNodeId(input.repoId), {
    entityKind: "repo",
    repoId: input.repoId,
  });
  accumulator.ensureNode(worktreeNodeId(input.worktreeId), {
    entityKind: "worktree",
    repoId: input.repoId,
    worktreeId: input.worktreeId,
    worktreeRoot: input.worktreeRoot,
  });
  accumulator.addEdge(repoNodeId(input.repoId), worktreeNodeId(input.worktreeId), "has_worktree");

  if (input.checkoutEpochId !== null) {
    accumulator.ensureNode(checkoutEpochNodeId(input.checkoutEpochId), {
      entityKind: "checkout_epoch",
      repoId: input.repoId,
      worktreeId: input.worktreeId,
      checkoutEpochId: input.checkoutEpochId,
      openedAt: input.occurredAt,
    });
    accumulator.addEdge(
      worktreeNodeId(input.worktreeId),
      checkoutEpochNodeId(input.checkoutEpochId),
      "entered_epoch",
    );
  }

  if (input.causalSessionId !== null) {
    accumulator.ensureNode(causalSessionNodeId(input.causalSessionId), {
      entityKind: "causal_session",
      repoId: input.repoId,
      causalSessionId: input.causalSessionId,
      persistenceClass: "artifact_history",
      startedAt: input.occurredAt,
    });
    accumulator.addEdge(
      repoNodeId(input.repoId),
      causalSessionNodeId(input.causalSessionId),
      "has_causal_session",
    );
  }

  if (input.strandId !== null && input.causalSessionId !== null && input.checkoutEpochId !== null) {
    accumulator.ensureNode(strandNodeId(input.strandId), {
      entityKind: "strand",
      repoId: input.repoId,
      causalSessionId: input.causalSessionId,
      strandId: input.strandId,
      originCheckoutEpochId: input.checkoutEpochId,
      createdAt: input.occurredAt,
    });
    accumulator.addEdge(
      causalSessionNodeId(input.causalSessionId),
      strandNodeId(input.strandId),
      "owns_strand",
    );
    accumulator.addEdge(
      strandNodeId(input.strandId),
      checkoutEpochNodeId(input.checkoutEpochId),
      "anchored_to",
    );
  }

  if (input.workspaceSliceId !== null) {
    accumulator.ensureNode(workspaceSliceNodeId(input.workspaceSliceId), {
      entityKind: "workspace_slice",
      repoId: input.repoId,
      worktreeId: input.worktreeId,
      workspaceSliceId: input.workspaceSliceId,
      transportSessionId: input.transportSessionId,
      openedAt: input.occurredAt,
      causalSessionId: input.causalSessionId,
      checkoutEpochId: input.checkoutEpochId,
    });
    if (input.causalSessionId !== null) {
      accumulator.addEdge(
        causalSessionNodeId(input.causalSessionId),
        workspaceSliceNodeId(input.workspaceSliceId),
        "has_workspace_slice",
      );
    }
    accumulator.addEdge(
      workspaceSliceNodeId(input.workspaceSliceId),
      worktreeNodeId(input.worktreeId),
      "bound_to",
    );
    if (input.checkoutEpochId !== null) {
      accumulator.addEdge(
        workspaceSliceNodeId(input.workspaceSliceId),
        checkoutEpochNodeId(input.checkoutEpochId),
        "opened_at_epoch",
      );
    }
  }

  if (input.workspaceOverlayId !== null && input.checkoutEpochId !== null) {
    accumulator.ensureNode(workspaceOverlayNodeId(input.workspaceOverlayId), {
      entityKind: "workspace_overlay",
      repoId: input.repoId,
      worktreeId: input.worktreeId,
      checkoutEpochId: input.checkoutEpochId,
      workspaceOverlayId: input.workspaceOverlayId,
      observedAt: input.occurredAt,
    });
    accumulator.addEdge(
      workspaceOverlayNodeId(input.workspaceOverlayId),
      checkoutEpochNodeId(input.checkoutEpochId),
      "anchored_to",
    );
  }
}

function ensureAttribution(
  accumulator: PatchAccumulator,
  eventNodeId: string,
  attribution: AttributionSummary,
): void {
  accumulator.ensureNode(actorNodeId(attribution.actor.actorId), {
    entityKind: "actor",
    ...attribution.actor,
  });
  accumulator.addEdge(eventNodeId, actorNodeId(attribution.actor.actorId), "attributed_to");

  for (const evidence of attribution.evidence) {
    accumulator.ensureNode(evidenceNodeId(evidence.evidenceId), {
      entityKind: "evidence",
      ...evidence,
    });
    accumulator.addEdge(eventNodeId, evidenceNodeId(evidence.evidenceId), "supported_by");
  }
}

function ensureFootprint(
  accumulator: PatchAccumulator,
  eventNodeId: string,
  footprint: CausalFootprint,
  workspaceOverlayId: string | null,
): void {
  const footprintId = footprintNodeId(digestFootprint(footprint));
  accumulator.ensureNode(footprintId, {
    entityKind: "causal_footprint",
    footprintDigest: digestFootprint(footprint),
    paths: footprint.paths,
    symbols: footprint.symbols,
    shape: deriveFootprintShape(footprint),
  });
  accumulator.addEdge(eventNodeId, footprintId, "has_footprint");

  for (const region of footprint.regions) {
    const regionId = regionNodeId(digestRegion(region));
    accumulator.ensureNode(regionId, {
      entityKind: "causal_region",
      ...region,
    });
    accumulator.addEdge(footprintId, regionId, "has_region");
  }

  for (const filePath of footprint.paths) {
    accumulator.ensureNode(fileNodeId(filePath), { path: filePath });
    accumulator.addEdge(footprintId, fileNodeId(filePath), "references_file");
    if (workspaceOverlayId !== null) {
      accumulator.addEdge(
        workspaceOverlayNodeId(workspaceOverlayId),
        fileNodeId(filePath),
        "touches_file",
      );
    }
  }
}

function ensureEventCommon(
  accumulator: PatchAccumulator,
  graph: PersistedLocalHistoryGraphContext,
  eventNodeId: string,
  event: {
    readonly eventId: string;
    readonly eventKind: string;
    readonly repoId: string;
    readonly worktreeId: string | null;
    readonly checkoutEpochId: string | null;
    readonly workspaceOverlayId: string | null;
    readonly transportSessionId: string | null;
    readonly workspaceSliceId: string | null;
    readonly causalSessionId: string | null;
    readonly strandId: string | null;
    readonly actorId: string | null;
    readonly occurredAt: string;
    readonly attribution: AttributionSummary;
    readonly confidence: string;
  },
): void {
  if (event.worktreeId === null) {
    return;
  }

  ensureAnchors(accumulator, {
    repoId: event.repoId,
    worktreeId: event.worktreeId,
    worktreeRoot: graph.worktreeRoot,
    checkoutEpochId: event.checkoutEpochId,
    causalSessionId: event.causalSessionId,
    strandId: event.strandId,
    workspaceSliceId: event.workspaceSliceId,
    transportSessionId: event.transportSessionId,
    workspaceOverlayId: event.workspaceOverlayId,
    occurredAt: event.occurredAt,
  });

  accumulator.ensureNode(eventNodeId, {
    entityKind: "local_history_event",
    eventId: event.eventId,
    eventKind: event.eventKind,
    repoId: event.repoId,
    occurredAt: event.occurredAt,
    persistenceClass: "artifact_history",
    attributionConfidence: event.confidence,
    attributionBasis: event.attribution.basis,
    worktreeId: event.worktreeId,
    checkoutEpochId: event.checkoutEpochId,
    workspaceOverlayId: event.workspaceOverlayId,
    transportSessionId: event.transportSessionId,
    workspaceSliceId: event.workspaceSliceId,
    causalSessionId: event.causalSessionId,
    strandId: event.strandId,
    actorId: event.actorId,
  });

  accumulator.addEdge(eventNodeId, worktreeNodeId(event.worktreeId), "in_worktree");
  if (event.causalSessionId !== null) {
    accumulator.addEdge(eventNodeId, causalSessionNodeId(event.causalSessionId), "in_session");
  }
  if (event.strandId !== null) {
    accumulator.addEdge(eventNodeId, strandNodeId(event.strandId), "in_strand");
  }
  if (event.checkoutEpochId !== null) {
    accumulator.addEdge(eventNodeId, checkoutEpochNodeId(event.checkoutEpochId), "in_checkout_epoch");
  }
  if (event.workspaceSliceId !== null) {
    accumulator.addEdge(eventNodeId, workspaceSliceNodeId(event.workspaceSliceId), "in_workspace_slice");
  }

  ensureAttribution(accumulator, eventNodeId, event.attribution);
}

export async function writeContinuityRecordToGraph(
  graph: PersistedLocalHistoryGraphContext,
  input: {
    readonly record: PersistedLocalHistoryGraphContinuityRecord;
    readonly previousEventId: string | null;
  },
): Promise<void> {
  const accumulator = createPatchAccumulator();
  const eventNode = localHistoryEventNodeId(input.record.recordId);

  ensureEventCommon(accumulator, graph, eventNode, {
    eventId: input.record.recordId,
    eventKind: "continuity",
    repoId: input.record.repoId,
    worktreeId: input.record.worktreeId,
    checkoutEpochId: input.record.checkoutEpochId,
    workspaceOverlayId: input.record.workspaceOverlayId,
    transportSessionId: input.record.transportSessionId,
    workspaceSliceId: input.record.workspaceSliceId,
    causalSessionId: input.record.causalSessionId,
    strandId: input.record.strandId,
    actorId: input.record.attribution.actor.actorId,
    occurredAt: input.record.occurredAt,
    attribution: input.record.attribution,
    confidence: input.record.continuityConfidence,
  });

  accumulator.ensureNode(eventNode, {
    continuityKey: input.record.continuityKey,
    continuityOperation: input.record.operation,
    continuedFromEventId: input.record.continuedFromRecordId,
    continuedFromCausalSessionId: input.record.continuedFromCausalSessionId,
    continuedFromStrandId: input.record.continuedFromStrandId,
  });

  for (const evidence of input.record.continuityEvidence) {
    accumulator.ensureNode(evidenceNodeId(evidence.evidenceId), {
      entityKind: "evidence",
      ...evidence,
    });
    accumulator.addEdge(eventNode, evidenceNodeId(evidence.evidenceId), "supported_by");
  }

  if (input.previousEventId !== null) {
    accumulator.addEdge(eventNode, localHistoryEventNodeId(input.previousEventId), "follows");
  }
  if (input.record.continuedFromRecordId !== null) {
    accumulator.addEdge(
      eventNode,
      localHistoryEventNodeId(input.record.continuedFromRecordId),
      "continues_from",
    );
  }
  if (input.record.operation === "start" || input.record.operation === "fork") {
    accumulator.addEdge(eventNode, strandNodeId(input.record.strandId), "creates_strand");
  }
  if (input.record.operation === "park") {
    accumulator.addEdge(eventNode, strandNodeId(input.record.strandId), "parks_strand");
  }

  await commitAccumulator(graph, accumulator);
}

export async function writeCausalEventToGraph(
  graph: PersistedLocalHistoryGraphContext,
  input: {
    readonly event: Extract<CausalEvent, { eventKind: "read" | "stage" | "transition" }>;
    readonly previousEventId: string | null;
    readonly stagedTarget?: RuntimeStagedTargetFullFile | undefined;
  },
): Promise<void> {
  const accumulator = createPatchAccumulator();
  const eventNode = localHistoryEventNodeId(input.event.eventId);

  ensureEventCommon(accumulator, graph, eventNode, input.event);
  ensureFootprint(accumulator, eventNode, input.event.footprint, input.event.workspaceOverlayId);

  if (input.previousEventId !== null) {
    accumulator.addEdge(eventNode, localHistoryEventNodeId(input.previousEventId), "follows");
  }

  if (input.event.eventKind === "read") {
    accumulator.ensureNode(eventNode, {
      surface: input.event.payload.surface,
      projection: input.event.payload.projection,
      sourceLayer: input.event.payload.sourceLayer,
      reason: input.event.payload.reason,
    });
  }

  if (input.event.eventKind === "stage") {
    accumulator.ensureNode(eventNode, {
      targetId: input.event.payload.targetId,
      selectionKind: input.event.payload.selectionKind,
    });

    const stagedTarget = input.stagedTarget;
    if (stagedTarget !== undefined) {
      const targetNode = stagedTargetNodeId(stagedTarget.target.targetId);
      accumulator.ensureNode(targetNode, {
        entityKind: "staged_target",
        repoId: stagedTarget.target.repoId,
        targetId: stagedTarget.target.targetId,
        selectionKind: stagedTarget.target.selectionKind,
        checkoutEpochId: stagedTarget.target.checkoutEpochId,
        observedAt: stagedTarget.target.selectedAt,
      });
      accumulator.addEdge(eventNode, targetNode, "captures_target");
      accumulator.addEdge(
        targetNode,
        workspaceOverlayNodeId(stagedTarget.target.workspaceOverlayId),
        "selected_from",
      );
      for (const entry of stagedTarget.target.selectionEntries) {
        accumulator.ensureNode(fileNodeId(entry.path), { path: entry.path });
        accumulator.addEdge(targetNode, fileNodeId(entry.path), "targets_file");
        for (const symbol of entry.symbols) {
          accumulator.ensureNode(symbolNodeId(entry.path, symbol), {
            name: symbol,
          });
          accumulator.addEdge(targetNode, symbolNodeId(entry.path, symbol), "targets_symbol");
        }
      }
    }
  }

  if (input.event.eventKind === "transition") {
    accumulator.ensureNode(eventNode, {
      semanticKind: input.event.payload.semanticKind,
      authority: input.event.payload.authority,
      phase: input.event.payload.phase,
      summary: input.event.payload.summary,
      transitionKind: input.event.payload.transitionKind,
      fromRef: input.event.payload.fromRef,
      toRef: input.event.payload.toRef,
      createdCheckoutEpochId: input.event.payload.createdCheckoutEpochId,
    });
    if (input.event.payload.createdCheckoutEpochId !== null) {
      accumulator.addEdge(
        eventNode,
        checkoutEpochNodeId(input.event.payload.createdCheckoutEpochId),
        "creates_epoch",
      );
    }
  }

  await commitAccumulator(graph, accumulator);
}
