import { describe, expect, it } from "vitest";
import {
  actorSchema,
  attributionSummarySchema,
  causalEventSchema,
  collapseWitnessSchema,
  evidenceSchema,
  getMaximumConfidenceForEvidence,
  isConfidenceBoundedByEvidence,
  stagedTargetSchema,
} from "../../../src/contracts/causal-ontology.js";

describe("contracts: causal ontology", () => {
  it("parses representative actor and evidence records", () => {
    const actor = actorSchema.parse({
      actorId: "actor_agent_1",
      actorKind: "agent",
      displayName: "Codex",
      source: "mcp_transport_binding",
      authorityScope: "authoritative",
    });

    const evidence = evidenceSchema.parse({
      evidenceId: "evidence_1",
      evidenceKind: "writer_lane_identity",
      source: "daemon_scheduler",
      capturedAt: "2026-04-09T00:00:00.000Z",
      strength: "direct",
      details: {
        writerId: "graft_session_abc123",
      },
    });

    expect(actor.actorKind).toBe("agent");
    expect(evidence.strength).toBe("direct");
  });

  it("enforces staged-target selection rules for full-file, partial-file, and symbol-subset targets", () => {
    const fullFile = stagedTargetSchema.parse({
      targetId: "target_full_file",
      targetKind: "staged_target",
      repoId: "repo_1",
      worktreeId: "worktree_1",
      checkoutEpochId: "epoch_1",
      workspaceOverlayId: "overlay_1",
      selectedAt: "2026-04-09T00:00:00.000Z",
      selectionKind: "full_file",
      selectionEntries: [
        {
          path: "src/server.ts",
          symbols: [],
          regions: [],
        },
      ],
      base: {
        headCommitSha: "abc123",
        indexTreeSha: null,
      },
    });

    expect(fullFile.selectionKind).toBe("full_file");

    expect(() => stagedTargetSchema.parse({
      targetId: "target_partial_missing_regions",
      targetKind: "staged_target",
      repoId: "repo_1",
      worktreeId: "worktree_1",
      checkoutEpochId: "epoch_1",
      workspaceOverlayId: "overlay_1",
      selectedAt: "2026-04-09T00:00:00.000Z",
      selectionKind: "partial_file",
      selectionEntries: [
        {
          path: "src/server.ts",
          symbols: [],
          regions: [],
        },
      ],
      base: {
        headCommitSha: "abc123",
        indexTreeSha: null,
      },
    })).toThrow(/Partial-file staged targets require at least one region/);

    expect(() => stagedTargetSchema.parse({
      targetId: "target_symbol_missing_symbols",
      targetKind: "staged_target",
      repoId: "repo_1",
      worktreeId: "worktree_1",
      checkoutEpochId: "epoch_1",
      workspaceOverlayId: "overlay_1",
      selectedAt: "2026-04-09T00:00:00.000Z",
      selectionKind: "symbol_subset",
      selectionEntries: [
        {
          path: "src/server.ts",
          symbols: [],
          regions: [],
        },
      ],
      base: {
        headCommitSha: "abc123",
        indexTreeSha: null,
      },
    })).toThrow(/Symbol-subset staged targets require at least one symbol/);
  });

  it("parses representative causal event variants", () => {
    const readEvent = causalEventSchema.parse({
      eventId: "evt_read_1",
      eventKind: "read",
      repoId: "repo_1",
      worktreeId: "worktree_1",
      checkoutEpochId: "epoch_1",
      workspaceOverlayId: "overlay_1",
      transportSessionId: "transport_1",
      workspaceSliceId: "slice_1",
      causalSessionId: "causal_1",
      strandId: "strand_1",
      actorId: "actor_1",
      confidence: "medium",
      evidenceIds: ["evidence_1"],
      footprint: {
        paths: ["src/server.ts"],
        symbols: [],
        regions: [],
      },
      occurredAt: "2026-04-09T00:00:00.000Z",
      payload: {
        surface: "safe_read",
        projection: "outline",
        sourceLayer: "workspace_overlay",
        reason: "OUTLINE",
      },
    });

    const stageEvent = causalEventSchema.parse({
      eventId: "evt_stage_1",
      eventKind: "stage",
      repoId: "repo_1",
      worktreeId: "worktree_1",
      checkoutEpochId: "epoch_1",
      workspaceOverlayId: "overlay_1",
      transportSessionId: "transport_1",
      workspaceSliceId: "slice_1",
      causalSessionId: "causal_1",
      strandId: "strand_1",
      actorId: "actor_1",
      confidence: "high",
      evidenceIds: ["evidence_1"],
      footprint: {
        paths: ["src/server.ts"],
        symbols: [],
        regions: [],
      },
      occurredAt: "2026-04-09T00:00:00.000Z",
      payload: {
        targetId: "target_1",
        footprint: {
          paths: ["src/server.ts"],
          symbols: [],
          regions: [],
        },
        selectionKind: "full_file",
      },
    });

    expect(readEvent.eventKind).toBe("read");
    expect(stageEvent.eventKind).toBe("stage");
  });

  it("keeps attribution confidence bounded by evidence strength", () => {
    expect(getMaximumConfidenceForEvidence(["weak"])).toBe("low");
    expect(getMaximumConfidenceForEvidence(["strong"])).toBe("medium");
    expect(getMaximumConfidenceForEvidence(["direct"])).toBe("high");
    expect(getMaximumConfidenceForEvidence(["strong", "conflicted"])).toBe("unknown");

    expect(isConfidenceBoundedByEvidence("low", ["strong"])).toBe(true);
    expect(isConfidenceBoundedByEvidence("high", ["strong"])).toBe(false);
    expect(isConfidenceBoundedByEvidence("unknown", ["conflicted"])).toBe(true);
  });

  it("requires attribution summaries to stay bounded by supporting evidence", () => {
    const summary = attributionSummarySchema.parse({
      actor: {
        actorId: "agent:test",
        actorKind: "agent",
        displayName: "Codex",
        source: "causal_attach.declaration",
        authorityScope: "declared",
      },
      confidence: "high",
      basis: "explicit_declaration",
      evidence: [{
        evidenceId: "evidence_attach_1",
        evidenceKind: "explicit_agent_declaration",
        source: "causal_attach.declaration",
        capturedAt: "2026-04-10T00:00:00.000Z",
        strength: "direct",
        details: {
          actorId: "agent:test",
        },
      }],
    });

    expect(summary.actor.actorKind).toBe("agent");

    expect(() => attributionSummarySchema.parse({
      actor: {
        actorId: "git:transition",
        actorKind: "git",
        displayName: "Git transition",
        source: "persisted_local_history.checkout_transition",
        authorityScope: "inferred",
      },
      confidence: "high",
      basis: "git_transition",
      evidence: [{
        evidenceId: "evidence_git_1",
        evidenceKind: "git_transition_observation",
        source: "persisted_local_history.checkout_transition",
        capturedAt: "2026-04-10T00:00:00.000Z",
        strength: "strong",
        details: {
          transitionKind: "checkout",
        },
      }],
    })).toThrow(/Attribution confidence must be bounded by supporting evidence strength/);
  });

  it("requires shared collapse-witness events to also be included events", () => {
    const witness = collapseWitnessSchema.parse({
      collapseRecordId: "collapse_1",
      targetKind: "staged_target",
      targetId: "target_1",
      targetFootprint: {
        paths: ["src/server.ts"],
        symbols: [],
        regions: [],
      },
      base: {
        repoId: "repo_1",
        checkoutEpochId: "epoch_1",
        commitSha: "abc123",
      },
      causalSessionId: "causal_1",
      strandIds: ["strand_1"],
      includedEventIds: ["evt_1", "evt_2"],
      sharedEventIds: ["evt_2"],
      excludedBoundaries: [
        {
          afterEventId: "evt_2",
          reason: "outside_target_footprint",
        },
      ],
      evidenceIds: ["evidence_1"],
      confidence: "medium",
      createdAt: "2026-04-09T00:00:00.000Z",
    });

    expect(witness.sharedEventIds).toEqual(["evt_2"]);

    expect(() => collapseWitnessSchema.parse({
      collapseRecordId: "collapse_1",
      targetKind: "staged_target",
      targetId: "target_1",
      targetFootprint: {
        paths: ["src/server.ts"],
        symbols: [],
        regions: [],
      },
      base: {
        repoId: "repo_1",
        checkoutEpochId: "epoch_1",
        commitSha: "abc123",
      },
      causalSessionId: "causal_1",
      strandIds: ["strand_1"],
      includedEventIds: ["evt_1"],
      sharedEventIds: ["evt_2"],
      excludedBoundaries: [],
      evidenceIds: ["evidence_1"],
      confidence: "medium",
      createdAt: "2026-04-09T00:00:00.000Z",
    })).toThrow(/Shared events must also appear in includedEventIds/);
  });
});
