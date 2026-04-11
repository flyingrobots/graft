import { describe, expect, it } from "vitest";
import type { RepoConcurrencySummary } from "../../../src/mcp/repo-concurrency.js";
import { mergeRepoConcurrencySummaryWithLiveSessions } from "../../../src/mcp/repo-concurrency.js";

function buildSummary(overrides: Partial<RepoConcurrencySummary> = {}): RepoConcurrencySummary {
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

describe("mergeRepoConcurrencySummaryWithLiveSessions", () => {
  it("upgrades exclusive posture to shared_worktree when another bound daemon session shares the worktree", () => {
    const merged = mergeRepoConcurrencySummaryWithLiveSessions({
      currentSummary: buildSummary(),
      currentRepoId: "repo:one",
      currentWorktreeId: "worktree:one",
      currentCheckoutEpochId: "epoch:one",
      sessions: [
        {
          bindState: "bound",
          repoId: "repo:one",
          worktreeId: "worktree:one",
          causalSessionId: "causal:one",
          checkoutEpochId: "epoch:one",
        },
        {
          bindState: "bound",
          repoId: "repo:one",
          worktreeId: "worktree:one",
          causalSessionId: "causal:two",
          checkoutEpochId: "epoch:one",
        },
      ],
    });

    expect(merged).toEqual(expect.objectContaining({
      posture: "shared_worktree",
      authority: "daemon_live_sessions",
      observedWorktreeCount: 1,
      observedCausalSessionCount: 2,
    }));
  });

  it("preserves explicit handoff when the same worktree has multiple daemon sessions but no other worktree", () => {
    const merged = mergeRepoConcurrencySummaryWithLiveSessions({
      currentSummary: buildSummary({
        authority: "explicit_handoff",
        summary: "Explicit attach or handoff evidence keeps the current live worktree on one lawful line of work.",
      }),
      currentRepoId: "repo:one",
      currentWorktreeId: "worktree:one",
      currentCheckoutEpochId: "epoch:one",
      sessions: [
        {
          bindState: "bound",
          repoId: "repo:one",
          worktreeId: "worktree:one",
          causalSessionId: "causal:one",
          checkoutEpochId: "epoch:one",
        },
        {
          bindState: "bound",
          repoId: "repo:one",
          worktreeId: "worktree:one",
          causalSessionId: "causal:two",
          checkoutEpochId: "epoch:one",
        },
      ],
    });

    expect(merged).toEqual(expect.objectContaining({
      posture: "exclusive",
      authority: "explicit_handoff",
      observedCausalSessionCount: 2,
    }));
  });

  it("upgrades to shared_repo_only when another worktree in the same repo is active on the same checkout", () => {
    const merged = mergeRepoConcurrencySummaryWithLiveSessions({
      currentSummary: buildSummary(),
      currentRepoId: "repo:one",
      currentWorktreeId: "worktree:one",
      currentCheckoutEpochId: "epoch:one",
      sessions: [
        {
          bindState: "bound",
          repoId: "repo:one",
          worktreeId: "worktree:one",
          causalSessionId: "causal:one",
          checkoutEpochId: "epoch:one",
        },
        {
          bindState: "bound",
          repoId: "repo:one",
          worktreeId: "worktree:two",
          causalSessionId: "causal:two",
          checkoutEpochId: "epoch:one",
        },
      ],
    });

    expect(merged).toEqual(expect.objectContaining({
      posture: "shared_repo_only",
      authority: "daemon_live_sessions",
      observedWorktreeCount: 2,
      observedCausalSessionCount: 2,
    }));
  });

  it("upgrades to divergent_checkout when another same-repo worktree is on a different checkout epoch", () => {
    const merged = mergeRepoConcurrencySummaryWithLiveSessions({
      currentSummary: buildSummary(),
      currentRepoId: "repo:one",
      currentWorktreeId: "worktree:one",
      currentCheckoutEpochId: "epoch:main",
      sessions: [
        {
          bindState: "bound",
          repoId: "repo:one",
          worktreeId: "worktree:one",
          causalSessionId: "causal:one",
          checkoutEpochId: "epoch:main",
        },
        {
          bindState: "bound",
          repoId: "repo:one",
          worktreeId: "worktree:two",
          causalSessionId: "causal:two",
          checkoutEpochId: "epoch:feature",
        },
      ],
    });

    expect(merged).toEqual(expect.objectContaining({
      posture: "divergent_checkout",
      authority: "daemon_live_sessions",
      observedWorktreeCount: 2,
      observedCausalSessionCount: 2,
    }));
  });
});
