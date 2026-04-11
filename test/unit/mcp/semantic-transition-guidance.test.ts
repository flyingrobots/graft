import { describe, expect, it } from "vitest";
import { deriveCausalSurfaceNextAction } from "../../../src/mcp/semantic-transition-guidance.js";
import type { RepoConcurrencySummary } from "../../../src/mcp/repo-concurrency.js";

function buildRepoConcurrency(
  overrides: Partial<RepoConcurrencySummary> = {},
): RepoConcurrencySummary {
  return {
    posture: "exclusive",
    authority: "active_history_scan",
    observedWorktreeCount: 1,
    observedCausalSessionCount: 1,
    observedActorCount: 1,
    overlappingPathCount: 0,
    summary: "No other active same-repo worktree or overlapping actor evidence is currently visible.",
    ...overrides,
  };
}

describe("mcp: semantic transition guidance", () => {
  it("recommends coordination when the current worktree is shared", () => {
    expect(deriveCausalSurfaceNextAction(
      "continue_active_causal_workspace",
      null,
      buildRepoConcurrency({ posture: "shared_worktree", authority: "daemon_live_sessions" }),
    )).toBe("coordinate_shared_worktree_before_continuing");
  });

  it("recommends overlap inspection when multiple actors touch the same footprint", () => {
    expect(deriveCausalSurfaceNextAction(
      "continue_active_causal_workspace",
      null,
      buildRepoConcurrency({ posture: "overlapping_actors", authority: "footprint_overlap" }),
    )).toBe("inspect_overlapping_actor_activity_before_continuing");
  });

  it("recommends divergence review when same-repo work is split across checkout epochs", () => {
    expect(deriveCausalSurfaceNextAction(
      "continue_active_causal_workspace",
      null,
      buildRepoConcurrency({ posture: "divergent_checkout", authority: "daemon_live_sessions" }),
    )).toBe("review_divergent_checkout_before_continuing");
  });

  it("keeps semantic transition guidance higher priority than concurrency guidance", () => {
    expect(deriveCausalSurfaceNextAction(
      "continue_active_causal_workspace",
      {
        kind: "merge_phase",
        authority: "authoritative_git_state",
        phase: "conflicted",
        summary: "Merge is waiting on conflict resolution.",
        evidence: {
          totalPaths: 1,
          stagedPaths: 0,
          changedPaths: 1,
          untrackedPaths: 0,
          unmergedPaths: 1,
          mergeInProgress: true,
          rebaseInProgress: false,
          rebaseStep: null,
          rebaseTotalSteps: null,
          lastTransitionKind: "merge",
          reflogSubject: null,
        },
      },
      buildRepoConcurrency({ posture: "shared_worktree", authority: "daemon_live_sessions" }),
    )).toBe("complete_merge_phase_before_continuing");
  });

  it("preserves explicit boundary review when local-history continuity already requires it", () => {
    expect(deriveCausalSurfaceNextAction(
      "review_transition_boundary_before_continuing",
      null,
      buildRepoConcurrency({ posture: "shared_worktree", authority: "daemon_live_sessions" }),
    )).toBe("review_transition_boundary_before_continuing");
  });
});
