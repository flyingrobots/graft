import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const designDocPath = path.join(
  repoRoot,
  "docs/design/0060-persisted-sub-commit-local-history/persisted-sub-commit-local-history.md",
);
const invariantsReadmePath = path.join(repoRoot, "docs/invariants/README.md");
const designDoc = fs.readFileSync(designDocPath, "utf-8");
const invariantsReadme = fs.readFileSync(invariantsReadmePath, "utf-8");

function expectMentions(text: string, terms: string[]) {
  for (const term of terms) {
    expect(text).toContain(term);
  }
}

describe("0060 playback: persisted sub-commit local history", () => {
  it("Can a human explain what persisted local history is, how it differs from Git commit history, and how it differs from admitted canonical provenance?", () => {
    expectMentions(designDoc, [
      "Persisted local history is durable `artifact_history`",
      "without pretending that persisted",
      "artifact history is either Git history or admitted canonical",
      "### Persistence layers",
      "`persisted_local_history`",
      "`canonical_provenance`",
      "`canonical_structural_truth`",
    ]);
    expect(invariantsReadme).toContain("persisted-local-history-artifact-history.md");
  });

  it("Does reconnecting an agent or handing work to another actor preserve one coherent line of work when lawful, instead of forcing a fake fresh start?", () => {
    expectMentions(designDoc, [
      "### Unit of continuity",
      "reconnecting may continue the same causal session",
      "### Lifecycle operations",
      "`attach`",
      "`resume`",
      "`fork`",
      "`park`",
      "Initial lawful attach conditions:",
    ]);
  });

  it("Are branch switches, merges, rewrites, and detached-head moves explicit continuity boundaries that park, fork, or re-anchor local history instead of smearing it?", () => {
    expectMentions(designDoc, [
      "### Relationship to checkout epochs",
      "Branch switches, merges, rewrites, and detached-head moves",
      "a parked strand",
      "a forked strand",
      "an explicitly re-anchored continuation record",
    ]);
  });

  it("Can a human inspect persisted local history through bounded machine-readable surfaces rather than raw append-only logs or chat transcripts?", () => {
    expectMentions(designDoc, [
      "inspectable through bounded JSON and",
      "### Slice 2: inspectable status surfaces",
      "persisted local-history summaries",
      "The design should make one thing especially clear:",
    ]);
  });

  it("Is persisted local history anchored to causal sessions, strands, and checkout epochs instead of transport-session lifetime?", () => {
    expectMentions(designDoc, [
      "Persisted local history is keyed primarily by:",
      "`causalSessionId`",
      "`strandId`",
      "`checkoutEpochId`",
      "`transportSessionId` remains a correlation handle only.",
    ]);
  });

  it("Are the persistence classes explicit enough to implement without churn: transient runtime residue, persisted local artifact history, admitted canonical provenance, canonical structural truth?", () => {
    expectMentions(designDoc, [
      "### Persistence layers",
      "`runtime_residue`",
      "`persisted_local_history`",
      "`canonical_provenance`",
      "`canonical_structural_truth`",
    ]);
  });

  it("Are attach, resume, fork, and park semantics explicit enough for agents to reason about continuity across reconnects and handoff?", () => {
    expectMentions(designDoc, [
      "### Lifecycle operations",
      "`attach`",
      "`resume`",
      "`fork`",
      "`park`",
      "Initial lawful attach conditions:",
    ]);
  });

  it("Is the bounded surface explicit about what evidence it preserves, what it excludes, and what action a human or agent should take next?", () => {
    expectMentions(designDoc, [
      "Default persist-worthy records:",
      "Default non-persist-worthy residue:",
      "### Slice 2: inspectable status surfaces",
      "\"what survived from the last session?\" answers",
    ]);
  });

  it("Is the dependency boundary explicit between what Graft can persist locally now and what remains blocked on upstream `git-warp v17.1.0+` collapse support?", () => {
    expectMentions(designDoc, [
      "## Upstream dependency boundary",
      "### What Graft can settle locally now",
      "### What remains blocked on `git-warp v17.1.0+`",
    ]);
  });
});
