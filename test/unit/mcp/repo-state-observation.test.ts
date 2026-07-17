import { describe, expect, it } from "vitest";
import { buildSemanticTransition } from "../../../src/mcp/repo-state-observation.js";
import type { RepoSnapshot, RepoTransition } from "../../../src/mcp/repo-state-types.js";

function snapshot(overrides: Partial<RepoSnapshot> = {}): RepoSnapshot {
  return {
    headRef: "main",
    headSha: "a".repeat(40),
    parentShas: ["b".repeat(40)],
    observedAt: "2026-07-15T00:00:00.000Z",
    statusLines: [],
    dirty: false,
    stagedPaths: 0,
    changedPaths: 0,
    untrackedPaths: 0,
    unmergedPaths: 0,
    mergeInProgress: false,
    rebase: {
      inProgress: false,
      step: null,
      total: null,
    },
    headReflog: null,
    ...overrides,
  };
}

function transition(kind: RepoTransition["kind"]): RepoTransition {
  return {
    kind,
    fromRef: "feature",
    toRef: "main",
    fromCommit: "b".repeat(40),
    toCommit: "a".repeat(40),
    evidence: {
      reflogSubject: `${kind}: observed by git`,
    },
  };
}

describe("repo semantic transition observation", () => {
  it("keeps an ordinary dirty first snapshot as baseline state", () => {
    const current = snapshot({
      statusLines: Array.from({ length: 253 }, (_, index) => `?? file-${String(index)}.ts`),
      dirty: true,
      untrackedPaths: 253,
    });

    expect(buildSemanticTransition(null, current, null)).toBeNull();
  });

  it("does not repeat an unchanged dirty snapshot as movement", () => {
    const previous = snapshot({
      statusLines: [" M app.ts"],
      dirty: true,
      changedPaths: 1,
    });
    const current = snapshot({
      ...previous,
      observedAt: "2026-07-15T00:00:01.000Z",
    });

    expect(buildSemanticTransition(previous, current, null)).toBeNull();
  });

  it("classifies a changed dirty snapshot as snapshot-delta movement", () => {
    const previous = snapshot({
      statusLines: Array.from({ length: 7 }, (_, index) => ` M file-${String(index)}.ts`),
      dirty: true,
      changedPaths: 7,
    });
    const current = snapshot({
      statusLines: Array.from({ length: 8 }, (_, index) => ` M file-${String(index)}.ts`),
      dirty: true,
      changedPaths: 8,
    });

    expect(buildSemanticTransition(previous, current, null)).toEqual(expect.objectContaining({
      kind: "bulk_transition",
      authority: "repo_snapshot",
      observationBasis: "snapshot_delta",
    }));
  });

  it("classifies clearing the final dirty path as an observed snapshot delta", () => {
    const previous = snapshot({
      statusLines: [" M app.ts"],
      dirty: true,
      changedPaths: 1,
    });

    expect(buildSemanticTransition(previous, snapshot(), null)).toEqual(
      expect.objectContaining({
        kind: "unknown",
        authority: "repo_snapshot",
        observationBasis: "snapshot_delta",
      }),
    );
  });

  it("reports authoritative first and unchanged active phases as current state", () => {
    const activeMerge = snapshot({
      statusLines: ["UU app.ts"],
      dirty: true,
      unmergedPaths: 1,
      mergeInProgress: true,
    });
    const activeRebase = snapshot({
      statusLines: [" M app.ts"],
      dirty: true,
      changedPaths: 1,
      rebase: {
        inProgress: true,
        step: 2,
        total: 4,
      },
    });

    expect(buildSemanticTransition(null, activeMerge, null)).toEqual(expect.objectContaining({
      kind: "merge_phase",
      authority: "authoritative_git_state",
      observationBasis: "current_state",
      phase: "conflicted",
    }));
    expect(buildSemanticTransition(activeRebase, {
      ...activeRebase,
      observedAt: "2026-07-15T00:00:01.000Z",
    }, null)).toEqual(expect.objectContaining({
      kind: "rebase_phase",
      authority: "authoritative_git_state",
      observationBasis: "current_state",
      phase: null,
    }));
  });

  it("distinguishes Git transition evidence from snapshot deltas", () => {
    const previous = snapshot({ mergeInProgress: true });
    const current = snapshot();

    expect(buildSemanticTransition(previous, current, transition("merge"))).toEqual(
      expect.objectContaining({
        kind: "merge_phase",
        observationBasis: "git_transition_evidence",
        phase: "completed_or_cleared",
      }),
    );
  });

  it.each(["checkout", "reset"] as const)(
    "retains direct %s evidence when the workspace projection is unchanged",
    (kind) => {
      const previous = snapshot();

      expect(buildSemanticTransition(previous, {
        ...previous,
        observedAt: "2026-07-15T00:00:01.000Z",
      }, transition(kind))).toEqual(expect.objectContaining({
        kind: "unknown",
        authority: "repo_snapshot",
        observationBasis: "git_transition_evidence",
      }));
    },
  );

  it("treats a changed conflict path set as a snapshot delta even when the count is stable", () => {
    const previous = snapshot({
      statusLines: ["UM first.ts"],
      dirty: true,
      unmergedPaths: 1,
    });
    const current = snapshot({
      statusLines: ["UM second.ts"],
      dirty: true,
      unmergedPaths: 1,
    });

    expect(buildSemanticTransition(previous, current, null)).toEqual(
      expect.objectContaining({
        kind: "conflict_resolution",
        observationBasis: "snapshot_delta",
      }),
    );
  });

  it("does not treat unrelated workspace churn as conflict movement", () => {
    const previous = snapshot({
      statusLines: ["UM conflict.ts"],
      dirty: true,
      unmergedPaths: 1,
    });
    const current = snapshot({
      statusLines: ["UM conflict.ts", "?? notes.txt"],
      dirty: true,
      untrackedPaths: 1,
      unmergedPaths: 1,
    });

    expect(buildSemanticTransition(previous, current, null)).toEqual(
      expect.objectContaining({
        kind: "conflict_resolution",
        observationBasis: "current_state",
      }),
    );
  });

  it.each(["merge", "rebase"] as const)(
    "does not treat unrelated workspace churn as active %s movement",
    (kind) => {
      const active = kind === "merge"
        ? { mergeInProgress: true }
        : {
            rebase: {
              inProgress: true,
              step: 2,
              total: 4,
            },
          };
      const previous = snapshot({
        ...active,
        statusLines: ["UM conflict.ts"],
        dirty: true,
        unmergedPaths: 1,
      });
      const current = snapshot({
        ...active,
        statusLines: ["UM conflict.ts", "?? notes.txt"],
        dirty: true,
        untrackedPaths: 1,
        unmergedPaths: 1,
      });

      expect(buildSemanticTransition(previous, current, null)).toEqual(
        expect.objectContaining({
          kind: kind === "merge" ? "merge_phase" : "rebase_phase",
          observationBasis: "current_state",
        }),
      );
    },
  );
});
