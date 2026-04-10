import { z } from "zod";

export const ACTOR_KINDS = [
  "human",
  "agent",
  "git",
  "daemon",
  "unknown",
] as const;

export const actorKindSchema = z.enum(ACTOR_KINDS);
export type ActorKind = z.infer<typeof actorKindSchema>;

export const AUTHORITY_SCOPES = [
  "authoritative",
  "declared",
  "inferred",
  "mixed",
] as const;

export const authorityScopeSchema = z.enum(AUTHORITY_SCOPES);
export type AuthorityScope = z.infer<typeof authorityScopeSchema>;

export const actorSchema = z.object({
  actorId: z.string().min(1),
  actorKind: actorKindSchema,
  displayName: z.string().min(1).optional(),
  source: z.string().min(1),
  authorityScope: authorityScopeSchema,
}).strict();

export type Actor = z.infer<typeof actorSchema>;

export const EVIDENCE_KINDS = [
  "mcp_transport_binding",
  "workspace_authorization",
  "explicit_handoff",
  "git_transition_observation",
  "git_hook_transition",
  "git_index_observation",
  "worktree_fs_observation",
  "writer_lane_identity",
  "explicit_user_declaration",
  "explicit_agent_declaration",
  "conflicting_actor_signal",
] as const;

export const evidenceKindSchema = z.enum(EVIDENCE_KINDS);
export type EvidenceKind = z.infer<typeof evidenceKindSchema>;

export const EVIDENCE_STRENGTHS = [
  "direct",
  "strong",
  "weak",
  "conflicted",
] as const;

export const evidenceStrengthSchema = z.enum(EVIDENCE_STRENGTHS);
export type EvidenceStrength = z.infer<typeof evidenceStrengthSchema>;

export const evidenceSchema = z.object({
  evidenceId: z.string().min(1),
  evidenceKind: evidenceKindSchema,
  source: z.string().min(1),
  capturedAt: z.string().min(1),
  strength: evidenceStrengthSchema,
  details: z.record(z.string(), z.unknown()),
}).strict();

export type Evidence = z.infer<typeof evidenceSchema>;

export const ATTRIBUTION_CONFIDENCES = [
  "high",
  "medium",
  "low",
  "unknown",
] as const;

export const attributionConfidenceSchema = z.enum(ATTRIBUTION_CONFIDENCES);
export type AttributionConfidence = z.infer<typeof attributionConfidenceSchema>;

export const ATTRIBUTION_BASES = [
  "explicit_declaration",
  "git_transition",
  "unknown_fallback",
  "conflicting_signals",
] as const;

export const attributionBasisSchema = z.enum(ATTRIBUTION_BASES);
export type AttributionBasis = z.infer<typeof attributionBasisSchema>;

const confidenceRank = Object.freeze({
  unknown: 0,
  low: 1,
  medium: 2,
  high: 3,
} as const satisfies Record<AttributionConfidence, number>);

export function getMaximumConfidenceForEvidence(
  strengths: readonly EvidenceStrength[],
): AttributionConfidence {
  if (strengths.length === 0) {
    return "unknown";
  }
  if (strengths.includes("conflicted")) {
    return "unknown";
  }
  if (strengths.includes("direct")) {
    return "high";
  }
  if (strengths.includes("strong")) {
    return "medium";
  }
  if (strengths.includes("weak")) {
    return "low";
  }
  return "unknown";
}

export function isConfidenceBoundedByEvidence(
  confidence: AttributionConfidence,
  strengths: readonly EvidenceStrength[],
): boolean {
  return confidenceRank[confidence] <= confidenceRank[getMaximumConfidenceForEvidence(strengths)];
}

export const attributionSummarySchema = z.object({
  actor: actorSchema,
  confidence: attributionConfidenceSchema,
  basis: attributionBasisSchema,
  evidence: z.array(evidenceSchema),
}).strict().superRefine((summary, ctx) => {
  if (!isConfidenceBoundedByEvidence(
    summary.confidence,
    summary.evidence.map((evidence) => evidence.strength),
  )) {
    ctx.addIssue({
      code: "custom",
      message: "Attribution confidence must be bounded by supporting evidence strength",
      path: ["confidence"],
    });
  }
});

export type AttributionSummary = z.infer<typeof attributionSummarySchema>;

export const causalRegionSchema = z.object({
  path: z.string().min(1),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  startColumn: z.number().int().positive().optional(),
  endColumn: z.number().int().positive().optional(),
}).strict();

export type CausalRegion = z.infer<typeof causalRegionSchema>;

function hasUniqueItems(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

export const causalFootprintSchema = z.object({
  paths: z.array(z.string().min(1)),
  symbols: z.array(z.string().min(1)),
  regions: z.array(causalRegionSchema),
}).strict().superRefine((footprint, ctx) => {
  if (!hasUniqueItems(footprint.paths)) {
    ctx.addIssue({
      code: "custom",
      message: "Footprint paths must be unique",
      path: ["paths"],
    });
  }
  if (!hasUniqueItems(footprint.symbols)) {
    ctx.addIssue({
      code: "custom",
      message: "Footprint symbols must be unique",
      path: ["symbols"],
    });
  }
});

export type CausalFootprint = z.infer<typeof causalFootprintSchema>;

export const SOURCE_LAYERS = [
  "canonical_structural_truth",
  "workspace_overlay",
  "strand_local_speculation",
] as const;

export const sourceLayerSchema = z.enum(SOURCE_LAYERS);
export type SourceLayer = z.infer<typeof sourceLayerSchema>;

export const SELECTION_KINDS = [
  "full_file",
  "partial_file",
  "symbol_subset",
] as const;

export const selectionKindSchema = z.enum(SELECTION_KINDS);
export type SelectionKind = z.infer<typeof selectionKindSchema>;

export const stagedTargetSelectionEntrySchema = z.object({
  path: z.string().min(1),
  symbols: z.array(z.string().min(1)),
  regions: z.array(causalRegionSchema),
}).strict().superRefine((entry, ctx) => {
  if (!hasUniqueItems(entry.symbols)) {
    ctx.addIssue({
      code: "custom",
      message: "Selection entry symbols must be unique",
      path: ["symbols"],
    });
  }
});

export type StagedTargetSelectionEntry = z.infer<typeof stagedTargetSelectionEntrySchema>;

const stagedTargetBaseSchema = z.object({
  headCommitSha: z.string().min(1),
  indexTreeSha: z.string().min(1).nullable(),
}).strict();

export const stagedTargetSchema = z.object({
  targetId: z.string().min(1),
  targetKind: z.literal("staged_target"),
  repoId: z.string().min(1),
  worktreeId: z.string().min(1),
  checkoutEpochId: z.string().min(1),
  workspaceOverlayId: z.string().min(1),
  selectedAt: z.string().min(1),
  selectionKind: selectionKindSchema,
  selectionEntries: z.array(stagedTargetSelectionEntrySchema).min(1),
  base: stagedTargetBaseSchema,
}).strict().superRefine((target, ctx) => {
  const seenPaths = new Set<string>();
  for (const [index, entry] of target.selectionEntries.entries()) {
    if (seenPaths.has(entry.path)) {
      ctx.addIssue({
        code: "custom",
        message: "Selection entry paths must be unique within a staged target",
        path: ["selectionEntries", index, "path"],
      });
    }
    seenPaths.add(entry.path);

    if (target.selectionKind === "full_file" && entry.regions.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: "Full-file staged targets must not carry regions",
        path: ["selectionEntries", index, "regions"],
      });
    }
    if (target.selectionKind === "partial_file" && entry.regions.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Partial-file staged targets require at least one region",
        path: ["selectionEntries", index, "regions"],
      });
    }
    if (target.selectionKind === "symbol_subset" && entry.symbols.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Symbol-subset staged targets require at least one symbol",
        path: ["selectionEntries", index, "symbols"],
      });
    }
  }
});

export type StagedTarget = z.infer<typeof stagedTargetSchema>;

export const DECISION_KINDS = [
  "task_intent",
  "hypothesis_shift",
  "accepted_alternative",
  "rejected_alternative",
  "checkpoint",
] as const;

export const decisionKindSchema = z.enum(DECISION_KINDS);
export type DecisionKind = z.infer<typeof decisionKindSchema>;

export const WRITE_KINDS = [
  "human_edit",
  "agent_edit",
  "git_generated",
  "stage_projection",
] as const;

export const writeKindSchema = z.enum(WRITE_KINDS);
export type WriteKind = z.infer<typeof writeKindSchema>;

export const TRANSITION_KINDS = [
  "checkout",
  "merge",
  "rewrite",
  "detached_head",
] as const;

export const transitionKindSchema = z.enum(TRANSITION_KINDS);
export type TransitionKind = z.infer<typeof transitionKindSchema>;

export const HANDOFF_KINDS = [
  "attach",
  "resume",
  "fork",
  "park",
] as const;

export const handoffKindSchema = z.enum(HANDOFF_KINDS);
export type HandoffKind = z.infer<typeof handoffKindSchema>;

export const LOCAL_HISTORY_CONTINUITY_OPERATIONS = [
  "start",
  "attach",
  "resume",
  "fork",
  "park",
] as const;

export const localHistoryContinuityOperationSchema = z.enum(LOCAL_HISTORY_CONTINUITY_OPERATIONS);
export type LocalHistoryContinuityOperation = z.infer<typeof localHistoryContinuityOperationSchema>;

const causalEventCommonSchema = z.object({
  eventId: z.string().min(1),
  repoId: z.string().min(1),
  worktreeId: z.string().min(1).nullable(),
  checkoutEpochId: z.string().min(1).nullable(),
  workspaceOverlayId: z.string().min(1).nullable(),
  transportSessionId: z.string().min(1).nullable(),
  workspaceSliceId: z.string().min(1).nullable(),
  causalSessionId: z.string().min(1).nullable(),
  strandId: z.string().min(1).nullable(),
  actorId: z.string().min(1).nullable(),
  confidence: attributionConfidenceSchema,
  evidenceIds: z.array(z.string().min(1)),
  footprint: causalFootprintSchema,
  occurredAt: z.string().min(1),
}).strict().superRefine((event, ctx) => {
  if (!hasUniqueItems(event.evidenceIds)) {
    ctx.addIssue({
      code: "custom",
      message: "Evidence ids must be unique",
      path: ["evidenceIds"],
    });
  }
});

const readEventPayloadSchema = z.object({
  surface: z.string().min(1),
  projection: z.string().min(1),
  sourceLayer: sourceLayerSchema,
  reason: z.string().min(1),
}).strict();

const writeEventPayloadSchema = z.object({
  surface: z.string().min(1),
  writeKind: writeKindSchema,
  beforeRef: z.string().min(1).optional(),
  afterRef: z.string().min(1).optional(),
}).strict();

const decisionEventPayloadSchema = z.object({
  decisionKind: decisionKindSchema,
  summary: z.string().min(1),
}).strict();

const stageEventPayloadSchema = z.object({
  targetId: z.string().min(1),
  footprint: causalFootprintSchema,
  selectionKind: selectionKindSchema,
}).strict();

const commitEventPayloadSchema = z.object({
  commitSha: z.string().min(1),
  parentShas: z.array(z.string().min(1)),
  message: z.string(),
}).strict();

const transitionEventPayloadSchema = z.object({
  transitionKind: transitionKindSchema,
  fromRef: z.string().min(1),
  toRef: z.string().min(1),
  createdCheckoutEpochId: z.string().min(1),
}).strict();

const handoffEventPayloadSchema = z.object({
  handoffKind: handoffKindSchema,
  fromActorId: z.string().min(1).optional(),
  toActorId: z.string().min(1).optional(),
  notes: z.string().min(1).optional(),
}).strict();

export const readEventSchema = causalEventCommonSchema.extend({
  eventKind: z.literal("read"),
  payload: readEventPayloadSchema,
}).strict();

export const writeEventSchema = causalEventCommonSchema.extend({
  eventKind: z.literal("write"),
  payload: writeEventPayloadSchema,
}).strict();

export const decisionEventSchema = causalEventCommonSchema.extend({
  eventKind: z.literal("decision"),
  payload: decisionEventPayloadSchema,
}).strict();

export const stageEventSchema = causalEventCommonSchema.extend({
  eventKind: z.literal("stage"),
  payload: stageEventPayloadSchema,
}).strict();

export const commitEventSchema = causalEventCommonSchema.extend({
  eventKind: z.literal("commit"),
  payload: commitEventPayloadSchema,
}).strict();

export const transitionEventSchema = causalEventCommonSchema.extend({
  eventKind: z.literal("transition"),
  payload: transitionEventPayloadSchema,
}).strict();

export const handoffEventSchema = causalEventCommonSchema.extend({
  eventKind: z.literal("handoff"),
  payload: handoffEventPayloadSchema,
}).strict();

export const causalEventSchema = z.discriminatedUnion("eventKind", [
  readEventSchema,
  writeEventSchema,
  decisionEventSchema,
  stageEventSchema,
  commitEventSchema,
  transitionEventSchema,
  handoffEventSchema,
]);

export type CausalEvent = z.infer<typeof causalEventSchema>;

export const CAUSAL_PERSISTENCE_CLASSES = [
  "canonical_structural_truth",
  "canonical_provenance",
  "strand_local",
  "discardable",
] as const;

export const causalPersistenceClassSchema = z.enum(CAUSAL_PERSISTENCE_CLASSES);
export type CausalPersistenceClass = z.infer<typeof causalPersistenceClassSchema>;

export const COLLAPSE_TARGET_KINDS = [
  "staged_target",
  "commit",
] as const;

export const collapseTargetKindSchema = z.enum(COLLAPSE_TARGET_KINDS);
export type CollapseTargetKind = z.infer<typeof collapseTargetKindSchema>;

export const EXCLUSION_REASONS = [
  "outside_target_footprint",
  "different_checkout_epoch",
  "different_causal_session",
  "insufficient_evidence",
  "precedes_selection_boundary",
] as const;

export const exclusionReasonSchema = z.enum(EXCLUSION_REASONS);
export type ExclusionReason = z.infer<typeof exclusionReasonSchema>;

const collapseBoundarySchema = z.object({
  afterEventId: z.string().min(1),
  reason: exclusionReasonSchema,
  note: z.string().min(1).optional(),
}).strict();

export const collapseWitnessSchema = z.object({
  collapseRecordId: z.string().min(1),
  targetKind: collapseTargetKindSchema,
  targetId: z.string().min(1),
  targetFootprint: causalFootprintSchema,
  base: z.object({
    repoId: z.string().min(1),
    checkoutEpochId: z.string().min(1),
    commitSha: z.string().min(1),
  }).strict(),
  causalSessionId: z.string().min(1),
  strandIds: z.array(z.string().min(1)).min(1),
  includedEventIds: z.array(z.string().min(1)).min(1),
  sharedEventIds: z.array(z.string().min(1)),
  excludedBoundaries: z.array(collapseBoundarySchema),
  evidenceIds: z.array(z.string().min(1)).min(1),
  confidence: attributionConfidenceSchema,
  createdAt: z.string().min(1),
}).strict().superRefine((witness, ctx) => {
  if (!hasUniqueItems(witness.strandIds)) {
    ctx.addIssue({
      code: "custom",
      message: "Strand ids must be unique",
      path: ["strandIds"],
    });
  }
  if (!hasUniqueItems(witness.includedEventIds)) {
    ctx.addIssue({
      code: "custom",
      message: "Included event ids must be unique",
      path: ["includedEventIds"],
    });
  }
  if (!hasUniqueItems(witness.sharedEventIds)) {
    ctx.addIssue({
      code: "custom",
      message: "Shared event ids must be unique",
      path: ["sharedEventIds"],
    });
  }
  for (const [index, sharedEventId] of witness.sharedEventIds.entries()) {
    if (!witness.includedEventIds.includes(sharedEventId)) {
      ctx.addIssue({
        code: "custom",
        message: "Shared events must also appear in includedEventIds",
        path: ["sharedEventIds", index],
      });
    }
  }
  if (!hasUniqueItems(witness.evidenceIds)) {
    ctx.addIssue({
      code: "custom",
      message: "Witness evidence ids must be unique",
      path: ["evidenceIds"],
    });
  }
});

export type CollapseWitness = z.infer<typeof collapseWitnessSchema>;
