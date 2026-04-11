import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const designDocPath = path.join(
  repoRoot,
  "docs/design/0065-between-commit-activity-view/between-commit-activity-view.md",
);
const designDoc = fs.readFileSync(designDocPath, "utf-8");

function expectMentions(text: string, terms: string[]) {
  for (const term of terms) {
    expect(text).toContain(term);
  }
}

describe("0065 playback: between-commit activity view", () => {
  it("If a human asks what happened between the last Git commit and now, does Graft provide a bounded activity view instead of requiring raw chat-log reconstruction?", () => {
    expectMentions(designDoc, [
      "Ship the first honest human-facing surface for bounded between-commit",
      "\"what happened between the last Git commit and now?\"",
      "bounded activity view",
      "without reading chat logs",
    ]);
  });

  it("Does the first version stay explicit that it is bounded local `artifact_history`, not canonical provenance?", () => {
    expectMentions(designDoc, [
      "bounded local `artifact_history`",
      "not canonical provenance",
      "the view reports bounded local `artifact_history`",
    ]);
  });

  it("Does the view group recent reads, writes, stages, attaches, and semantic transitions around the current causal workspace and staged target when possible?", () => {
    expectMentions(designDoc, [
      "current workspace / causal workspace summary",
      "current staged-target summary",
      "`read`",
      "`write`",
      "`stage`",
      "`attach`",
      "`transition`",
    ]);
  });

  it("If the anchor to the last Git commit is weak or unavailable, does the view say so explicitly instead of faking a complete since-commit story?", () => {
    expectMentions(designDoc, [
      "current `HEAD` commit",
      "`anchor_unknown`",
      "instead of implying a full",
      "commit-to-now record",
    ]);
  });

  it("When the current workspace is shared, overlapping, divergent, or otherwise degraded, does the activity view preserve that context so humans do not over-trust the summary?", () => {
    expectMentions(designDoc, [
      "current degraded reasons and concurrency posture",
      "`shared_worktree`",
      "`overlapping_actors`",
      "`divergent_checkout`",
    ]);
  });

  it("Is the first-release contract explicit about truth class, boundedness, ordering, grouping, and degradation rules?", () => {
    expectMentions(designDoc, [
      "## Proposed first-release contract",
      "### Truth class and anchor",
      "### Minimum content model",
      "### Ordering and grouping rules",
    ]);
  });

  it("Is it explicit which existing substrates feed the view: persisted local history, attribution, staged-target state, overlay footing, semantic transitions, and repo concurrency?", () => {
    expectMentions(designDoc, [
      "persisted local `artifact_history`",
      "attribution",
      "staged-target summaries",
      "reactive workspace overlay footing",
      "semantic transition meaning",
      "same-repo concurrency posture",
    ]);
  });

  it("Does the cycle keep raw receipts, full chat transcript replay, canonical provenance, and causal collapse out of scope?", () => {
    expectMentions(designDoc, [
      "## Non-goals",
      "canonical provenance",
      "Replay raw chat transcripts",
      "raw receipts stay out of the first surface",
      "causal-collapse views",
    ]);
  });

  it("Is it explicit that the first implementation may ship as one bounded machine-readable surface before CLI / IDE wrappers are expanded?", () => {
    expectMentions(designDoc, [
      "The first implementation may ship as one bounded machine-readable",
      "surface before CLI / IDE wrappers are expanded",
      "the truth model, not the wrapper",
    ]);
  });

  it("Does the cycle preserve compatibility with later causal-slice / collapse work without pretending that admission exists today?", () => {
    expectMentions(designDoc, [
      "causal-slice / collapse views",
      "canonical provenance",
      "admit the whole session",
    ]);
  });
});
