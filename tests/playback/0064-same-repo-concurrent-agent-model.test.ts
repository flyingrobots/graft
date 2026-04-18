import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const designDocPath = path.join(
  repoRoot,
  "docs/design/WARP_same-repo-concurrent-agent-model.md",
);
const designDoc = fs.readFileSync(designDocPath, "utf-8");

function expectMentions(text: string, terms: string[]) {
  for (const term of terms) {
    expect(text).toContain(term);
  }
}

describe("0064 playback: same-repo concurrent agent model", () => {
  it("If two actors are working in the same worktree, can Graft tell a human that the line of work is shared or overlapping instead of pretending it still belongs cleanly to one actor?", () => {
    expectMentions(designDoc, [
      "#### Same repo, same worktree, different actors",
      "shared live workspace scope: yes",
      "supported observationally",
      "shared` / `overlapping` / `unknown`",
      "shared live worktree",
    ]);
  });

  it("If two actors are working in different worktrees of the same repo, can Graft keep canonical repo history shared while keeping live workspace footing separate?", () => {
    expectMentions(designDoc, [
      "#### Same repo, different worktrees",
      "shared canonical repo scope: yes",
      "shared live workspace scope: no",
      "separate live lines of work with shared repo truth",
    ]);
  });

  it("If two actors touch the same files or symbols without an explicit handoff, does Graft downgrade provenance confidence instead of inventing a clean ownership story?", () => {
    expectMentions(designDoc, [
      "### Overlapping versus disjoint footprints",
      "overlapping footprints in one worktree must downgrade confidence",
      "same-file or same-symbol overlap",
      "lawful handoff",
      "must not present clean single-actor ownership",
    ]);
  });

  it("If two actors are active in the same repo but on different branches or checkout epochs, can Graft surface that as divergence instead of silently merging their lines of work?", () => {
    expectMentions(designDoc, [
      "#### Same repo, different branches / checkout epochs",
      "branch or checkout divergence",
      "semantic",
      "silent",
      "continuity",
      "`divergent_checkout`",
    ]);
  });

  it("When evidence is too weak to separate actor ownership from shared repo activity, does Graft say `unknown` / `shared` instead of faking single-actor certainty?", () => {
    expectMentions(designDoc, [
      "### Concurrency postures",
      "`shared_repo_only`",
      "`shared_worktree`",
      "`overlapping_actors`",
      "`unknown`",
      "must not be used to fake clean ownership",
    ]);
  });

  it("Is the identity split explicit enough to implement without churn: canonical repo keyed by Git common dir, live workspace keyed by worktree root plus checkout epoch, and causal state keyed by causal session / strand family?", () => {
    expectMentions(designDoc, [
      "### Identity scopes",
      "Canonical repo scope",
      "keyed by Git common dir",
      "Live workspace scope",
      "keyed by worktree root plus checkout epoch",
      "Actor-local causal scope",
      "keyed by causal session / strand family",
    ]);
  });

  it("Is it explicit which same-repo scenarios are supported observationally versus unsupported for confident provenance or merge semantics?", () => {
    expectMentions(designDoc, [
      "## Supported scenario classes",
      "supported observationally",
      "## Provenance honesty boundary",
      "This cycle is allowed to say:",
      "This cycle is not allowed to say:",
      "multi-writer semantics",
    ]);
  });

  it("Is the downgrade rule explicit that overlapping actors in one worktree imply provenance uncertainty unless explicit handoff evidence exists?", () => {
    expectMentions(designDoc, [
      "### Evidence hierarchy",
      "explicit attach / handoff declarations",
      "same worktree identity plus overlapping active windows",
      "overlapping footprints within one live workspace",
      "Lower layers must not be used to fake clean ownership.",
    ]);
  });

  it("Is it explicit what shared state may exist across sessions in the same repo and what must remain worktree-local or actor-local?", () => {
    expectMentions(designDoc, [
      "### Shared-state rules",
      "What may be shared across sessions in the same repo:",
      "What must remain worktree-local:",
      "What must remain actor-local unless explicitly attached:",
    ]);
  });

  it("Does the cycle keep multi-writer merge semantics out of scope while still improving same-repo multi-actor honesty?", () => {
    expectMentions(designDoc, [
      "## Non-goals",
      "Implement multi-writer WARP merge semantics in this cycle.",
      "## Provenance honesty boundary",
      "Same-repo concurrency does not upgrade Level 1 into lawful",
      "multi-writer semantics",
    ]);
  });
});
