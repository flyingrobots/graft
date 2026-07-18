import { describe, expect, it } from "vitest";
import type { GitClient } from "../../../src/ports/git.js";
import { detectTransition } from "../../../src/mcp/repo-state-transition.js";
import type { HeadReflogEntry, RepoSnapshot } from "../../../src/mcp/repo-state-types.js";

const unusedGitClient: GitClient = {
  run() {
    throw new Error("same-position reflog tests must not query ancestry");
  },
};

function reflog(overrides: Partial<HeadReflogEntry> = {}): HeadReflogEntry {
  return {
    raw: `${"a".repeat(40)} ${"a".repeat(40)} Test <test@example.com> 1784340000 -0700\tcheckout: moving from feature to main`,
    previousSha: "a".repeat(40),
    nextSha: "a".repeat(40),
    timestampSec: 1_784_340_000,
    subject: "checkout: moving from feature to main",
    ...overrides,
  };
}

function snapshot(headReflog: HeadReflogEntry | null): RepoSnapshot {
  return {
    headRef: "main",
    headSha: "a".repeat(40),
    parentShas: ["b".repeat(40)],
    observedAt: "2026-07-17T20:00:00.000Z",
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
    headReflog,
  };
}

describe("repo transition evidence freshness", () => {
  it("does not replay an unchanged same-second reflog entry from the baseline", async () => {
    const baseline = snapshot(reflog());
    const repeated = {
      ...baseline,
      observedAt: "2026-07-17T20:00:00.500Z",
    };

    await expect(detectTransition(
      unusedGitClient,
      "/repo",
      baseline,
      repeated,
    )).resolves.toBeNull();
  });

  it("accepts a changed reflog entry as fresh direct Git evidence", async () => {
    const baseline = snapshot(reflog());
    const changed = snapshot(reflog({
      raw: `${"a".repeat(40)} ${"a".repeat(40)} Test <test@example.com> 1784340000 -0700\tcheckout: moving from main to feature`,
      subject: "checkout: moving from main to feature",
    }));

    await expect(detectTransition(
      unusedGitClient,
      "/repo",
      baseline,
      changed,
    )).resolves.toEqual(expect.objectContaining({
      kind: "checkout",
      fromRef: "main",
      toRef: "feature",
    }));
  });
});
