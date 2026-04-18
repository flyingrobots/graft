import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const designDocPath = path.join(
  repoRoot,
  "docs/design/WARP_richer-semantic-transitions.md",
);
const designDoc = fs.readFileSync(designDocPath, "utf-8");

function expectMentions(text: string, terms: string[]) {
  for (const term of terms) {
    expect(text).toContain(term);
  }
}

describe("0063 playback: richer semantic transitions", () => {
  it("After a meaningful repo transition, can a human inspect bounded surfaces and see transition meaning beyond raw Git lifecycle names like `checkout`, `merge`, or `rebase`?", () => {
    expectMentions(designDoc, [
      "## Hill",
      "semantic-transition vocabulary",
      "Git lifecycle event",
      "Semantic transition meaning",
      "raw Git lifecycle",
      "transition meaning beyond raw Git lifecycle",
    ]);
  });

  it("When many files move at once, does Graft summarize the transition in a way that helps a human understand whether this was bulk staging, conflict cleanup, merge fallout, or rebase churn?", () => {
    expectMentions(designDoc, [
      "#### `bulk_transition`",
      "file count",
      "staged/unstaged distribution",
      "many files at once",
      "bulk staging",
      "bulk edit sweep",
      "merge fallout",
      "inspect_bulk_transition_scope_before_continuing",
    ]);
  });

  it("When conflict files are resolved or reintroduced, can a human see that as `conflict_resolution` instead of only generic dirty-state churn?", () => {
    expectMentions(designDoc, [
      "#### `conflict_resolution`",
      "unmerged entries becoming resolved",
      "conflicted files shrinking toward a clean index",
      "conflict_resolution",
      "resolve_conflicts_before_continuing",
      "conflict posture worsening",
      "conflict posture fully clearing",
    ]);
  });

  it('During merge or rebase work, can a human see which phase they are in instead of only that "some transition happened"?', () => {
    expectMentions(designDoc, [
      "### Merge/rebase phase visibility",
      "### Transition-aware guidance",
      "#### `merge_phase`",
      "`resolved_waiting_commit`",
      "complete_merge_phase_before_continuing",
      "#### `rebase_phase`",
      "`continued`",
      "continue_rebase_phase_before_continuing",
      "merge/rebase progress inspectable as phase",
    ]);
  });

  it("When the evidence is weak, mixed, or too coarse, does Graft say `unknown` instead of pretending semantic confidence it does not have?", () => {
    expectMentions(designDoc, [
      "#### `unknown`",
      "too weak, mixed, stale, or too coarse",
      "too coarse",
      "downgrade-to-`unknown` rules",
      "pretending semantic confidence",
    ]);
  });

  it("Are the semantic transition classes explicit enough to implement without churn: `index_update`, `conflict_resolution`, `merge_phase`, `rebase_phase`, `bulk_transition`, `unknown`?", () => {
    expectMentions(designDoc, [
      "### Semantic transition classes",
      "#### `index_update`",
      "#### `conflict_resolution`",
      "#### `merge_phase`",
      "#### `rebase_phase`",
      "#### `bulk_transition`",
      "#### `unknown`",
    ]);
  });

  it("Is the evidence hierarchy explicit enough that agents know when a transition meaning is authoritative, inferred from repo state, or unavailable?", () => {
    expectMentions(designDoc, [
      "### Evidence hierarchy",
      "authoritative Git state files and index posture",
      "target-repo hook-observed transition events",
      "current repo snapshot inference",
      "degraded best-effort runtime footing",
    ]);
  });

  it("Is the distinction explicit between raw Git lifecycle events and higher-level semantic transition meaning?", () => {
    expectMentions(designDoc, [
      "### Transition layers",
      "**Git lifecycle event**",
      "**Semantic transition meaning**",
      "Git lifecycle events tell Graft that something happened.",
      "Semantic transitions tell bounded surfaces what kind of repo meaning is",
    ]);
  });

  it("Are merge/rebase phase boundaries explicit enough that agents do not invent their own repo lifecycle rules?", () => {
    expectMentions(designDoc, [
      "### Merge/rebase phase visibility",
      "merge started and is now conflicted",
      "merge conflicts are resolved but commit/admission is still pending",
      "rebase is currently conflicted",
      "rebase continued and the active phase cleared",
    ]);
  });

  it("Does the cycle keep semantic transition meaning separate from canonical provenance and later causal collapse?", () => {
    expectMentions(designDoc, [
      "## Provenance honesty boundary",
      "Semantic transition meaning is not canonical provenance.",
      "not themselves collapse-admitted explanation",
      "canonical provenance",
      "canonical structural truth",
    ]);
  });

  it("Does the cycle avoid overcommitting to same-repo multi-actor merge semantics while still improving single-workspace transition honesty?", () => {
    expectMentions(designDoc, [
      "## Non-goals",
      "Solve same-repo multi-actor merge semantics.",
      "Related:",
      "WARP_same-repo-concurrent-agent-model.md",
    ]);
  });
});
