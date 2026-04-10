import { describe, expect, it } from "vitest";
import type { AttributionSummary } from "../../../src/contracts/causal-ontology.js";
import type { RepoObservation } from "../../../src/mcp/repo-state.js";
import type { WorkspaceStatus } from "../../../src/mcp/workspace-router.js";
import { buildRuntimeCausalContext } from "../../../src/mcp/runtime-causal-context.js";
import { buildRuntimeStagedTarget } from "../../../src/mcp/runtime-staged-target.js";

function boundStatus(): WorkspaceStatus {
  return {
    sessionMode: "daemon",
    bindState: "bound",
    repoId: "repo:test",
    worktreeId: "worktree:test",
    worktreeRoot: "/repo",
    gitCommonDir: "/repo/.git",
    graftDir: "/repo/.graft",
    capabilityProfile: {
      boundedReads: true,
      structuralTools: true,
      precisionTools: true,
      stateBookmarks: true,
      runtimeLogs: "session_local_only",
      runCapture: false,
    },
  };
}

function repoState(overrides: Partial<RepoObservation> = {}): RepoObservation {
  return {
    checkoutEpoch: 1,
    headRef: "main",
    headSha: "0123456789abcdef0123456789abcdef01234567",
    dirty: false,
    observedAt: "2026-04-09T00:00:00.000Z",
    lastTransition: null,
    workspaceOverlayId: null,
    workspaceOverlay: null,
    statusLines: [],
    ...overrides,
  };
}

function unknownAttribution(): AttributionSummary {
  return {
    actor: {
      actorId: "unknown",
      actorKind: "unknown",
      displayName: "Unknown",
      source: "test.fallback",
      authorityScope: "inferred",
    },
    confidence: "unknown",
    basis: "unknown_fallback",
    evidence: [],
  };
}

describe("mcp: runtime staged target", () => {
  it("reports none when there are no staged paths", () => {
    const causalContext = buildRuntimeCausalContext({
      transportSessionId: "session:test",
      workspaceSliceId: "slice-0001",
      repoId: "repo:test",
      worktreeId: "worktree:test",
      checkoutEpoch: 1,
      warpWriterId: "graft",
    });

    expect(buildRuntimeStagedTarget(boundStatus(), causalContext, repoState(), unknownAttribution())).toEqual({
      availability: "none",
      stability: "runtime_local",
      provenanceLevel: "artifact_history",
    });
  });

  it("builds a full-file runtime staged target for obviously whole-file index selections", () => {
    const causalContext = buildRuntimeCausalContext({
      transportSessionId: "session:test",
      workspaceSliceId: "slice-0001",
      repoId: "repo:test",
      worktreeId: "worktree:test",
      checkoutEpoch: 1,
      warpWriterId: "graft",
    });

    const stagedTarget = buildRuntimeStagedTarget(boundStatus(), causalContext, repoState({
      dirty: true,
      workspaceOverlayId: "overlay:test",
      workspaceOverlay: {
        dirty: true,
        totalPaths: 1,
        stagedPaths: 1,
        changedPaths: 0,
        untrackedPaths: 0,
        actorGuess: "unknown",
        confidence: "low",
        evidence: {
          source: "git status --porcelain",
          reflogSubject: null,
          sample: ["A  new.ts"],
        },
      },
      statusLines: ["A  new.ts"],
    }), unknownAttribution());

    expect(stagedTarget.availability).toBe("full_file");
    if (stagedTarget.availability !== "full_file") {
      throw new Error("expected a full-file staged target");
    }
    expect(stagedTarget.target.selectionKind).toBe("full_file");
    expect(stagedTarget.attribution).toEqual(unknownAttribution());
    expect(stagedTarget.target.selectionEntries).toEqual([
      { path: "new.ts", symbols: [], regions: [] },
    ]);
    expect(stagedTarget.target.base.indexTreeSha).toBeNull();
    expect(stagedTarget.target.workspaceOverlayId).toBe("overlay:test");
  });

  it("marks modified staged paths as ambiguous until deeper selection evidence exists", () => {
    const causalContext = buildRuntimeCausalContext({
      transportSessionId: "session:test",
      workspaceSliceId: "slice-0001",
      repoId: "repo:test",
      worktreeId: "worktree:test",
      checkoutEpoch: 1,
      warpWriterId: "graft",
    });

    expect(buildRuntimeStagedTarget(boundStatus(), causalContext, repoState({
      dirty: true,
      workspaceOverlayId: "overlay:test",
      workspaceOverlay: {
        dirty: true,
        totalPaths: 1,
        stagedPaths: 1,
        changedPaths: 0,
        untrackedPaths: 0,
        actorGuess: "unknown",
        confidence: "low",
        evidence: {
          source: "git status --porcelain",
          reflogSubject: null,
          sample: ["M  app.ts"],
        },
      },
      statusLines: ["M  app.ts"],
    }), unknownAttribution())).toEqual({
      availability: "ambiguous",
      stability: "runtime_local",
      provenanceLevel: "artifact_history",
      attribution: unknownAttribution(),
      reason: "modified_path_selection_requires_deeper_evidence",
      observedStagedPaths: 1,
      ambiguousPaths: ["app.ts"],
    });
  });
});
