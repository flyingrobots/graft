import { describe, expect, it } from "vitest";
import { buildSemanticTransitionSummary } from "../../../src/mcp/semantic-transition-summary.js";

function evidence(overrides: Partial<Parameters<typeof buildSemanticTransitionSummary>[0]["evidence"]> = {}) {
  return {
    totalPaths: 0,
    stagedPaths: 0,
    changedPaths: 0,
    untrackedPaths: 0,
    unmergedPaths: 0,
    mergeInProgress: false,
    rebaseInProgress: false,
    rebaseStep: null,
    rebaseTotalSteps: null,
    lastTransitionKind: null,
    reflogSubject: null,
    ...overrides,
  };
}

describe("semantic transition summary", () => {
  it("distinguishes bulk staging from bulk edit sweeps", () => {
    expect(buildSemanticTransitionSummary({
      kind: "bulk_transition",
      phase: null,
      evidence: evidence({
        totalPaths: 8,
        stagedPaths: 8,
        changedPaths: 0,
      }),
    })).toBe("Bulk staging spans 8 path(s) at the index boundary.");

    expect(buildSemanticTransitionSummary({
      kind: "bulk_transition",
      phase: null,
      evidence: evidence({
        totalPaths: 8,
        stagedPaths: 0,
        changedPaths: 8,
      }),
    })).toBe("Bulk edit sweep spans 8 unstaged path(s).");
  });

  it("describes conflict posture emergence, shrinkage, widening, and clearance", () => {
    expect(buildSemanticTransitionSummary({
      kind: "conflict_resolution",
      phase: null,
      evidence: evidence({ unmergedPaths: 3 }),
      previousUnmergedPaths: 0,
    })).toBe("Conflict posture emerged across 3 path(s).");

    expect(buildSemanticTransitionSummary({
      kind: "conflict_resolution",
      phase: null,
      evidence: evidence({ unmergedPaths: 1 }),
      previousUnmergedPaths: 3,
    })).toBe("Conflict posture is shrinking from 3 to 1 path(s).");

    expect(buildSemanticTransitionSummary({
      kind: "conflict_resolution",
      phase: null,
      evidence: evidence({ unmergedPaths: 4 }),
      previousUnmergedPaths: 2,
    })).toBe("Conflict posture widened from 2 to 4 path(s).");

    expect(buildSemanticTransitionSummary({
      kind: "conflict_resolution",
      phase: null,
      evidence: evidence({ unmergedPaths: 0 }),
      previousUnmergedPaths: 2,
    })).toBe("Conflict posture cleared from 2 conflicted path(s).");
  });
});
