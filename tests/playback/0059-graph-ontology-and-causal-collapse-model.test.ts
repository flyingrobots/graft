import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const designDocPath = path.join(
  repoRoot,
  "docs/design/0059-graph-ontology-and-causal-collapse-model/graph-ontology-and-causal-collapse-model.md",
);
const invariantsReadmePath = path.join(repoRoot, "docs/invariants/README.md");
const designDoc = fs.readFileSync(designDocPath, "utf-8");
const invariantsReadme = fs.readFileSync(invariantsReadmePath, "utf-8");

function expectMentions(text: string, terms: string[]) {
  for (const term of terms) {
    expect(text).toContain(term);
  }
}

describe("0059 playback: graph ontology and causal collapse model", () => {
  it("Can a human explain the difference between canonical structural truth and canonical provenance for the same staged or committed artifact?", () => {
    expectMentions(designDoc, [
      "### Layer 1: Canonical structural truth",
      "### Layer 4: Canonical provenance",
      "It is the admitted explanation, not the full scratchpad.",
    ]);
  });

  it("Is partial-stage causal slicing the default collapse model, rather than whole-session or whole-strand admission?", () => {
    expectMentions(designDoc, [
      "### Default collapse target",
      "a staged file set",
      "### Default collapse rule",
      "Collapse is slice-based by default:",
      "Whole-session or whole-strand collapse is not the default",
    ]);
  });

  it("Are branch switches, detached-head moves, merges, and rewrites explicit checkout-epoch boundaries instead of hidden state drift?", () => {
    expectMentions(designDoc, [
      "### Checkout epoch identity",
      "checkout, merge, rebase/rewrite, detached-head move",
      "transition_event",
      "detached_head",
    ]);
  });

  it("Can the core collapse and provenance meaning be recovered from bounded machine-readable artifacts without relying on diagrams or rich UI decoration?", () => {
    expectMentions(designDoc, [
      "## Accessibility and Assistive Reading",
      "the core meaning must survive as bounded JSON-friendly artifacts",
      "collapse and provenance concepts must be explainable from bounded",
      "machine-readable artifacts, not only diagrams or long prose",
    ]);
  });

  it("Is transport session no longer overloaded as the product session model?", () => {
    expectMentions(designDoc, [
      "We need four distinct identities:",
      "`transportSessionId`",
      "`workspaceSliceId`",
      "`causalSessionId`",
      "`strandId`",
      "These must not be collapsed into one overloaded `session` concept.",
    ]);
    expect(invariantsReadme).toContain("transport-session-not-causal-session.md");
  });

  it("Are the first-class identities explicit enough to implement without churn: repo, worktree, checkout epoch, causal session, strand, event, staged target, commit, file, symbol?", () => {
    expectMentions(designDoc, [
      "Repo and worktree identity",
      "Checkout epoch identity",
      "Session identity",
      "Actor identity",
      "File and symbol identity",
      "## Concrete staged-target schema",
      "\"targetKind\": \"staged_target\"",
      "\"eventKind\": \"read|write|decision|stage|commit|transition|handoff\"",
    ]);
  });

  it("Is the event granularity explicit enough for causal-slice collapse instead of whole-tool-call replay?", () => {
    expectMentions(designDoc, [
      "Whole tool-call logging is not enough for causal slicing.",
      "`read_event`",
      "`write_event`",
      "`decision_event`",
      "`stage_event`",
      "`commit_event`",
      "`transition_event`",
      "`handoff_event`",
    ]);
    expect(invariantsReadme).toContain("causal-events-carry-footprints.md");
  });

  it("Is the dependency boundary explicit between local Graft design work and the upstream `git-warp v17.1.0+` substrate needed for full strand-aware collapse?", () => {
    expectMentions(designDoc, [
      "## Upstream dependency boundary",
      "What Graft can settle locally now",
      "What is blocked on `git-warp v17.1.0+`",
    ]);
  });

  it("Does the trust model bound attribution confidence by evidence instead of letting provenance overclaim?", () => {
    expectMentions(designDoc, [
      "## Actor, evidence, and confidence model",
      "### Evidence schema",
      "### Confidence rules",
      "no user-facing provenance surface may imply confidence higher than the",
      "supporting evidence allows",
    ]);
    expect(invariantsReadme).toContain("attribution-confidence-evidence-bounded.md");
  });

  it("Are agent-mediated provenance surfaces explicit about what is agent-generated, what evidence supports it, and whether they are reporting artifact history, canonical provenance, or inference?", () => {
    expectMentions(designDoc, [
      "## Agent Inspectability and Explainability",
      "artifact history, admitted",
      "canonical provenance, or a weaker inferred explanation",
      "must say what evidence backs it and what action the consumer should",
      "## Provenance honesty boundary",
      "`artifact_history`",
      "`canonical_provenance`",
      "`inference`",
      "no agent- or human-facing surface may present `inference` as if it",
      "were `canonical_provenance`",
    ]);
  });
});
