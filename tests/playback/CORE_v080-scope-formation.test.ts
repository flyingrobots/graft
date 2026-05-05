import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
let designDoc: string;

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function repoFileExists(path: string): boolean {
  return existsSync(resolve(repoRoot, path));
}

function markdownSection(markdown: string, heading: string): string {
  const lines = markdown.split(/\r?\n/);
  const headingLine = `## ${heading}`;
  const start = lines.findIndex((line) => line.trim() === headingLine);

  expect(start, `missing markdown section ${heading}`).toBeGreaterThanOrEqual(0);

  const end = lines.findIndex(
    (line, index) => index > start && /^#{1,2}\s+/.test(line),
  );

  return lines.slice(start + 1, end === -1 ? undefined : end).join("\n");
}

describe("CORE_v080-scope-formation playback", () => {
  beforeAll(() => {
    designDoc = readRepoFile("docs/design/CORE_v080-scope-formation.md");
  });

  it("Can a human see that this cycle forms v0.8.0 scope instead of shipping runtime behavior?", () => {
    const hill = markdownSection(designDoc, "Hill");
    const nonGoals = markdownSection(designDoc, "Non-goals");

    expect(hill).toContain("Settle the opening v0.8.0 lane");
    expect(hill).toContain("Review Truth");
    expect(hill).toContain("structural PR review summaries");
    expect(nonGoals).toMatch(/-\s+\[\s\]\s+Add runtime behavior\./);
    expect(hill).not.toContain("Add runtime behavior");
  });

  it("Can a human identify the first implementation pull candidate and the follow-up candidates?", () => {
    const openingLane = markdownSection(designDoc, "Opening Lane");

    expect(openingLane).toContain("First implementation pull");
    expect(openingLane).toContain("`CORE_pr-review-structural-summary`");
    expect(openingLane).toContain("`CORE_structural-test-coverage-map`");
    expect(openingLane).toContain("`SURFACE_git-graft-enhance-provenance-hints`");
    expect(openingLane).toContain("`WARP_symbol-history-timeline`");
    expect(openingLane).toContain("`WARP_dead-symbol-detection`");
    expect(openingLane).toContain("`SURFACE_review-cooldown-status`");
    expect(openingLane).toContain("`SURFACE_pr-feedback-resolution-ledger`");
    expect(openingLane).toContain("`CORE_tool-context-injection-contracts`");
    expect(openingLane).toContain("`TEST_bounded-subprocess-policy`");
    expect(repoFileExists("docs/method/backlog/v0.8.0/README.md")).toBe(true);
    expect(repoFileExists("docs/method/backlog/v0.8.0/CORE_pr-review-structural-summary.md")).toBe(true);
    expect(repoFileExists("docs/method/backlog/v0.8.0/CORE_structural-test-coverage-map.md")).toBe(true);
    expect(repoFileExists("docs/method/backlog/v0.8.0/SURFACE_git-graft-enhance-provenance-hints.md")).toBe(true);
    expect(repoFileExists("docs/method/backlog/v0.8.0/WARP_symbol-history-timeline.md")).toBe(true);
    expect(repoFileExists("docs/method/backlog/v0.8.0/WARP_dead-symbol-detection.md")).toBe(true);
    expect(repoFileExists("docs/method/backlog/v0.8.0/SURFACE_review-cooldown-status.md")).toBe(true);
    expect(repoFileExists("docs/method/backlog/v0.8.0/SURFACE_pr-feedback-resolution-ledger.md")).toBe(true);
    expect(repoFileExists("docs/method/backlog/v0.8.0/CORE_tool-context-injection-contracts.md")).toBe(true);
    expect(repoFileExists("docs/method/backlog/v0.8.0/TEST_bounded-subprocess-policy.md")).toBe(true);
  });

  it("Can a human see which tempting work is explicitly deferred from the opening v0.8.0 lane?", () => {
    const deferrals = markdownSection(designDoc, "Explicit Deferrals");

    expect(deferrals).toContain("`WARP_lsp-enrichment` continuation");
    expect(deferrals).toContain("`CORE_migrate-to-slice-first-reads`");
    expect(deferrals).toContain("git-warp observer geometry APIs");
    expect(deferrals).toContain("`SURFACE_bijou-daemon-control-plane-actions`");
    expect(deferrals).toContain("`SURFACE_git-graft-enhance-expanded-git-subcommands`");
    expect(deferrals).toContain("`CI-003-mcp-native-diff-protocol`");
    expect(designDoc).toContain("`WARP_auto-breaking-change-detection`");
  });

  it("Does the scope decision record the bearing context used for the next target?", () => {
    const backlogContext = markdownSection(designDoc, "Backlog Context");

    expect(backlogContext).toContain("the immediate focus is v0.8.0 scope formation");
    expect(backlogContext).toContain("centered on Review Truth");
    expect(backlogContext).toMatch(/automated review\s+readiness/);
    expect(backlogContext).toContain("removed-symbol evidence");
    expect(backlogContext).toContain("local review evidence");
    expect(designDoc).toContain("Review Truth for any Git repository");
    expect(backlogContext).toContain("avoid adding METHOD backlog/status features");
    expect(designDoc).toContain("The opening v0.8.0 lane is:");
  });

  it("Does the design keep METHOD backlog/status features out of Graft?", () => {
    const deferrals = markdownSection(designDoc, "Explicit Deferrals");
    const pullCriteria = markdownSection(designDoc, "Pull Criteria For The Next Cycle");
    const scopedText = `${deferrals}\n${pullCriteria}`.toLowerCase();

    expect(scopedText).toContain("no method backlog/status");
    expect(scopedText).toContain("method backlog/status/release surfaces");
    expect(scopedText).toMatch(/belong in method mcp\s*\/\s*method\s+cli/);
    expect(designDoc.toLowerCase()).not.toContain("graft backlog");
    expect(designDoc.toLowerCase()).not.toContain("graft retro");
  });

  it("Does the design preserve the shipped doctor and capability posture work as baseline, not work to reopen in this cycle?", () => {
    const baseline = markdownSection(designDoc, "Shipped Baseline To Preserve");

    expect(baseline).toContain("`CORE_graft-doctor`");
    expect(baseline.toLowerCase()).toContain("shipped repo-generic health posture");
    expect(baseline).toContain("`CORE_three-surface-capability-baseline-and-parity-matrix`");
    expect(baseline).toContain("`CORE_release-gate-for-three-surface-capability-posture`");
  });
});
