import { describe, expect, it } from "vitest";
import type { RepoConcurrencySummary } from "../../../src/mcp/repo-concurrency.js";
import {
  deriveRepoConcurrencySummary,
  mergeRepoConcurrencySummaryWithLiveSessions,
} from "../../../src/mcp/repo-concurrency.js";

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
  it("does not treat plain actor declarations as explicit handoff", () => {
    const summary = deriveRepoConcurrencySummary({
      currentWorktreeId: "worktree:one",
      histories: [
        {
          worktreeId: "worktree:one",
          active: true,
          checkoutEpochId: "epoch:one",
          causalSessionIds: ["causal:one", "causal:two"],
          actorIds: ["agent:one", "agent:two"],
          contributorKeys: ["actor:agent:one", "actor:agent:two"],
          explicitHandoff: false,
          touches: [
            { contributorKey: "actor:agent:one", path: "src/app.ts" },
            { contributorKey: "actor:agent:two", path: "src/app.ts" },
          ],
        },
      ],
    });

    expect(summary).toEqual(expect.objectContaining({
      posture: "overlapping_actors",
      authority: "footprint_overlap",
      overlappingPathCount: 1,
    }));
  });

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
