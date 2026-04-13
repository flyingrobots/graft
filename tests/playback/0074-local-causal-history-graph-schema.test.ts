import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const designDocPath = path.join(
  repoRoot,
  "docs/design/0074-local-causal-history-graph-schema/local-causal-history-graph-schema.md",
);
const causalOntologyPath = path.join(repoRoot, "src/contracts/causal-ontology.ts");
const designDoc = fs.readFileSync(designDocPath, "utf-8");
const causalOntology = fs.readFileSync(causalOntologyPath, "utf-8");

function expectMentions(text: string, terms: string[]) {
  for (const term of terms) {
    expect(text).toContain(term);
  }
}

describe("0074 playback: local causal history graph schema", () => {
  it("Can a human explain which identities are first-class in local causal history: repo, worktree, checkout epoch, causal session, strand, workspace slice, actor, event, footprint, staged target?", () => {
    expectMentions(designDoc, [
      "### Node families",
      "`repo`",
      "`worktree`",
      "`checkout_epoch`",
      "`causal_session`",
      "`strand`",
      "`workspace_slice`",
      "`actor`",
      "`local_history_event`",
      "`causal_footprint`",
      "`staged_target`",
    ]);
  });

  it("Can a human explain how `start`, `attach`, `resume`, `fork`, and `park` become graph events rather than JSON bookkeeping?", () => {
    expectMentions(designDoc, [
      "`continuity` event required subtype properties:",
      "`continuityOperation`",
      "`continues_from`",
      "`creates_strand`",
      "`parks_strand`",
      "`ContinuityRecord`",
      "`operation` becomes `continuityOperation`",
    ]);
    expect(causalOntology).toContain("LOCAL_HISTORY_CONTINUITY_OPERATIONS");
  });

  it("Is it explicit which current `.graft` persistence is meant to disappear under this model?", () => {
    expectMentions(designDoc, [
      "`.graft/local-history/*.json`",
      "no filesystem JSON source of truth for persisted local history",
      "`historyPath`",
      "Becomes: nothing",
      "user-authored repo config such as `.graftignore`",
    ]);
  });

  it("Does the packet keep local causal history as `artifact_history` rather than overclaiming canonical provenance?", () => {
    expectMentions(designDoc, [
      "persisted local history remains `artifact_history`",
      "`persistenceClass = \"artifact_history\"`",
      "Persisted local history remains `artifact_history`.",
      "these nodes are not canonical provenance by default",
      "later collapse may admit a slice without mutating raw local",
    ]);
  });

  it("Are node IDs, node families, edge labels, and required properties explicit enough to implement without guessing?", () => {
    expectMentions(designDoc, [
      "### Placement and namespace",
      "### Node families",
      "### Edge families",
      "Node id:",
      "Required properties:",
      "`lh:epoch:<checkoutEpochId>`",
      "`lh:event:<eventId>`",
      "`repo -has_worktree-> worktree`",
      "`local_history_event -in_session-> causal_session`",
    ]);
  });

  it("Can the current `ContinuityRecord`, `CausalEvent`, evidence, and attribution contracts map into this graph without a second schema?", () => {
    expectMentions(designDoc, [
      "## Mapping from the current JSON model",
      "`ContinuityRecord`",
      "`readEvents[]`, `stageEvents[]`, `transitionEvents[]`",
      "`continuityEvidence` and event `evidenceIds`",
      "`attribution`",
      "`footprint`",
    ]);
    expectMentions(causalOntology, [
      "export const evidenceSchema",
      "export const attributionSummarySchema",
      "export const causalEventSchema",
    ]);
  });

  it("Is active-strand / active-session state clearly derived from graph traversal rather than mutable stored pointers such as `activeRecordId`?", () => {
    expectMentions(designDoc, [
      "\"Current\" status is a query",
      "active state is derived from traversal",
      "`follows`",
      "`activeRecordId`",
      "Becomes: derived query result",
      "Never stored as durable graph truth",
    ]);
  });

  it("Is the boundary explicit between local-history storage that Graft can implement now and later collapse/admission machinery that may still depend on upstream `git-warp` evolution?", () => {
    expectMentions(designDoc, [
      "## Upstream dependency boundary",
      "### What Graft can settle locally now",
      "### What may still depend on later upstream work",
      "The storage model for local causal history is not blocked.",
      "The broader",
      "collapse model may still be.",
    ]);
  });
});
