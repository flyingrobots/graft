import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const designDocPath = path.join(
  repoRoot,
  "docs/design/0062-reactive-workspace-overlay/reactive-workspace-overlay.md",
);
const designDoc = fs.readFileSync(designDocPath, "utf-8");

function expectMentions(text: string, terms: string[]) {
  for (const term of terms) {
    expect(text).toContain(term);
  }
}

describe("0062 playback: reactive workspace overlay", () => {
  it("After local edits or checkout-boundary transitions, can a human inspect the active workspace and see an explicit reactive overlay footing instead of a silent best-effort guess?", () => {
    expectMentions(designDoc, [
      "## Hill",
      "Make the workspace overlay a first-class reactive product concept",
      "### Reactive overlay footing",
      "`workspaceOverlayId`",
      "explicit reactive overlay",
      "silent best-effort guess",
    ]);
  });

  it("When a branch switch or similar Git transition occurs, does Graft show a lawful overlay/session boundary instead of smearing one line of work across incompatible bases?", () => {
    expectMentions(designDoc, [
      "checkout epochs",
      "Git transitions are canonical lifecycle boundaries",
      "branch/checkout transition caused a fork/park/invalidate",
      "show a lawful overlay/session boundary instead of smearing one",
      "line of work across incompatible bases",
    ]);
  });

  it("Does Graft distinguish reactive live overlay state from canonical commit-worldline truth in bounded machine-readable surfaces?", () => {
    expectMentions(designDoc, [
      "Reactive overlay truth is still not canonical provenance.",
      "Bounded inspection",
      "can say whether overlay footing is",
      "reactive, inferred, or degraded",
    ]);
  });

  it("When Git hooks or equivalent transition surfaces are absent, does Graft degrade honestly instead of pretending full lifecycle coverage?", () => {
    expectMentions(designDoc, [
      "Absent hooks reduce certainty",
      "without hook/bootstrap support",
      "must not overclaim complete lifecycle coverage",
      "degrade honestly instead of pretending full lifecycle",
      "coverage",
    ]);
  });

  it("Are the overlay identities explicit enough to implement without churn: `repoId`, `worktreeRoot`, `checkoutEpochId`, `workspaceOverlayId`, and their relation to `causalSessionId` / `strandId`?", () => {
    expectMentions(designDoc, [
      "### Reactive overlay footing",
      "`repoId`",
      "`worktreeRoot`",
      "`checkoutEpochId`",
      "`workspaceOverlayId`",
      "`causalSessionId` /",
      "`strandId`",
    ]);
  });

  it("Is the precedence between watcher-style local edit signals and Git transition signals explicit enough that agents do not invent their own lifecycle rules?", () => {
    expectMentions(designDoc, [
      "### Signal hierarchy",
      "Git transitions are canonical lifecycle boundaries",
      "Reactive local edit signals update the current overlay",
      "Absent hooks reduce certainty",
    ]);
  });

  it("Does the cycle keep reactive overlay truth separate from canonical provenance and collapse-admitted explanation?", () => {
    expectMentions(designDoc, [
      "## Provenance honesty boundary",
      "Reactive overlay truth is still not canonical provenance.",
      "This cycle should strengthen the honesty of live workspace footing",
      "without pretending that:",
      "collapse has happened",
    ]);
  });

  it("Is the target-repo hook/bootstrap boundary explicit enough that agents know what can be implemented now versus what only becomes lawful once hooks are installed?", () => {
    expectMentions(designDoc, [
      "### Hook/bootstrap relation",
      "required",
      "companion seam, not a distant optional extra.",
      "what minimum product hook shim is required",
      "`graft init --write-target-git-hooks`",
      "what Graft can still claim honestly when hooks are absent",
    ]);
  });

  it("Does the cycle avoid accidentally overcommitting to the deeper same-repo concurrent-agent model while still improving single active-workspace honesty?", () => {
    expectMentions(designDoc, [
      "## Non-goals",
      "Solve same-repo multi-agent merge semantics.",
      "Related work",
      "WARP_same-repo-concurrent-agent-model.md",
    ]);
  });
});
