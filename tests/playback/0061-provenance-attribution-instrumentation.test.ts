import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const designDocPath = path.join(
  repoRoot,
  "docs/design/0061-provenance-attribution-instrumentation/provenance-attribution-instrumentation.md",
);
const invariantsReadmePath = path.join(repoRoot, "docs/invariants/README.md");
const designDoc = fs.readFileSync(designDocPath, "utf-8");
const invariantsReadme = fs.readFileSync(invariantsReadmePath, "utf-8");

function expectMentions(text: string, terms: string[]) {
  for (const term of terms) {
    expect(text).toContain(term);
  }
}

describe("0061 playback: provenance attribution instrumentation", () => {
  it("Can a human inspect the current causal workspace and see whether Graft attributes it to an `agent`, a `human`, `git`, or explicitly `unknown`?", () => {
    expectMentions(designDoc, [
      "### Attribution summary",
      "`human`, `agent`, `git`, `daemon`, `unknown`",
      "### Surfaces for this cycle",
      "`causal_status`",
      "`causal_attach`",
      "`doctor`",
    ]);
    expect(invariantsReadme).toContain("attribution-explicit-or-unknown.md");
  });

  it("When attribution evidence is weak, absent, or mixed, does Graft say `unknown` or mixed instead of pretending to know who caused the work?", () => {
    expectMentions(designDoc, [
      "### Default attribution rules",
      "Unknown is lawful",
      "when actor evidence is absent or mixed, attribution must remain",
      "`unknown`",
      "`conflicting_signals`",
    ]);
    expect(invariantsReadme).toContain("attribution-confidence-evidence-bounded.md");
  });

  it("Do explicit continuation/handoff declarations strengthen attribution lawfully instead of silently overwriting prior ambiguity?", () => {
    expectMentions(designDoc, [
      "Explicit declarations win when present",
      "`causal_attach` with explicit actor declaration",
      "direct declaration evidence for `human` and `agent`",
    ]);
  });

  it("Are checkout-boundary transitions allowed to attribute continuity movement to `git` when that is the strongest inspectable evidence?", () => {
    expectMentions(designDoc, [
      "Git transition evidence can attribute continuity movement to",
      "`git`",
      "checkout/fork/park continuity caused by observable Git transition",
    ]);
  });

  it("Can a human inspect attribution through bounded machine-readable surfaces rather than raw logs or transcripts?", () => {
    expectMentions(designDoc, [
      "## Accessibility and Assistive Reading",
      "attribution must be inspectable through bounded JSON",
      "### Slice 2: bounded inspection surfaces",
      "`causal_status`",
      "`doctor`",
    ]);
  });

  it("When a staged artifact is present, can a human inspect its runtime-local attribution directly instead of only the broader causal workspace attribution?", () => {
    expectMentions(designDoc, [
      "#### Slice 3: artifact-local staged-target attribution",
      "When a runtime-local staged target exists, project the current",
      "attribution summary onto that staged artifact surface too.",
      "who or what produced this current staged",
      "artifact-history step?",
    ]);
  });

  it("When an unambiguous staged artifact is present, can a human inspect the latest attributed `stage` event as bounded local `artifact_history`?", () => {
    expectMentions(designDoc, [
      "#### Slice 4: persisted local stage events",
      "persist a bounded",
      "local `stage` event",
      "the same evidence-bounded attribution summary",
      "still runtime-local `artifact_history`, not canonical provenance.",
    ]);
  });

  it("Are actor classes and authority scopes explicit enough to implement without churn: `human`, `agent`, `git`, `daemon`, `unknown` and `authoritative`, `declared`, `inferred`, `mixed`?", () => {
    expectMentions(designDoc, [
      "`human`, `agent`, `git`, `daemon`, `unknown`",
      "`authoritative`, `declared`, `inferred`, `mixed`",
      "### Attribution summary",
    ]);
  });

  it("Are attribution evidence, downgrade paths, and confidence bounds explicit enough that agents can reason about trust instead of guessing?", () => {
    expectMentions(designDoc, [
      "the rule that no bounded surface may imply a stronger actor claim",
      "than its evidence supports",
      "Continuity evidence is not automatically actor evidence",
      "confidence",
      "evidence",
    ]);
  });

  it("Does the cycle keep attribution separate from canonical provenance so runtime-local attribution does not overclaim collapse-admitted truth?", () => {
    expectMentions(designDoc, [
      "## Provenance honesty boundary",
      "runtime-local `artifact_history`",
      "it is not yet witness-backed canonical provenance",
    ]);
    expect(invariantsReadme).toContain("canonical-provenance-separate.md");
  });

  it("Is the runtime seam explicit about what evidence can currently prove `agent`/`human`/`git`, and what still remains `unknown`?", () => {
    expectMentions(designDoc, [
      "### What Graft can settle locally now",
      "direct declaration evidence for `human` and `agent`",
      "Git-transition-driven attribution",
      "explicit `unknown` fallback",
      "### What remains blocked on `git-warp v17.1.0+`",
    ]);
  });

  it("Does artifact-local attribution stay honest by projecting current local evidence onto staged targets without pretending to be collapse-admitted blame?", () => {
    expectMentions(designDoc, [
      "#### Slice 3: artifact-local staged-target attribution",
      "runtime-local staged target",
      "without pretending Graft has",
      "already performed causal collapse or canonical blame.",
    ]);
    expect(invariantsReadme).toContain("canonical-provenance-separate.md");
  });

  it("Does the cycle start using the causal-event contract for local attributed `stage` events without overclaiming canonical provenance?", () => {
    expectMentions(designDoc, [
      "#### Slice 4: persisted local stage events",
      "the staged target id",
      "the staged footprint",
      "the same evidence-bounded attribution summary",
      "not canonical provenance",
    ]);
  });
});
