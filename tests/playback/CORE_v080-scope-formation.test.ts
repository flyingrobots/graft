import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(import.meta.dirname, "../..");

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
    (line, index) => index > start && /^##\s+/.test(line),
  );

  return lines.slice(start + 1, end === -1 ? undefined : end).join("\n");
}

describe("CORE_v080-scope-formation playback", () => {
  it("Can a human see that this cycle forms v0.8.0 scope instead of shipping runtime behavior?", () => {
    const design = readRepoFile("docs/design/CORE_v080-scope-formation.md");
    const hill = markdownSection(design, "Hill");
    const nonGoals = markdownSection(design, "Non-goals");

    expect(hill).toContain("Settle the opening v0.8.0 lane");
    expect(hill).toContain("repo-generic operational truth");
    expect(nonGoals).toMatch(/-\s+\[\s\]\s+Add runtime behavior\./);
    expect(hill).not.toContain("Add runtime behavior");
  });

  it("Can a human identify the first implementation pull candidate and the follow-up candidates?", () => {
    const design = readRepoFile("docs/design/CORE_v080-scope-formation.md");
    const openingLane = markdownSection(design, "Opening Lane");

    expect(openingLane).toContain("First implementation pull");
    expect(openingLane).toContain("`CORE_pr-review-structural-summary`");
    expect(openingLane).toContain("`CORE_structural-test-coverage-map`");
    expect(openingLane).toContain("`SURFACE_review-cooldown-status`");
    expect(repoFileExists("docs/method/backlog/asap/CORE_pr-review-structural-summary.md")).toBe(true);
    expect(repoFileExists("docs/method/backlog/cool-ideas/CORE_structural-test-coverage-map.md")).toBe(true);
  });

  it("Can a human see which tempting work is explicitly deferred from the opening v0.8.0 lane?", () => {
    const design = readRepoFile("docs/design/CORE_v080-scope-formation.md");
    const deferrals = markdownSection(design, "Explicit Deferrals");

    expect(deferrals).toContain("`WARP_lsp-enrichment` continuation");
    expect(deferrals).toContain("`CORE_migrate-to-slice-first-reads`");
    expect(deferrals).toContain("git-warp observer geometry APIs");
    expect(deferrals).toContain("`SURFACE_bijou-daemon-control-plane-actions`");
  });

  it("Does the scope decision record the bearing context used for the next target?", () => {
    const design = readRepoFile("docs/design/CORE_v080-scope-formation.md");
    const backlogContext = markdownSection(design, "Backlog Context");

    expect(backlogContext).toContain("the immediate focus is v0.8.0 scope formation");
    expect(backlogContext).toContain("repo-generic operational truth surfaces");
    expect(backlogContext).toContain("avoid adding METHOD backlog/status features");
    expect(design).toContain("The opening v0.8.0 lane is:");
    expect(design).toContain("Repo-generic operational truth surfaces for any Git repository");
  });

  it("Does the design keep METHOD backlog/status features out of Graft?", () => {
    const design = readRepoFile("docs/design/CORE_v080-scope-formation.md");
    const deferrals = markdownSection(design, "Explicit Deferrals");
    const pullCriteria = markdownSection(design, "Pull Criteria For The Next Cycle");
    const scopedText = `${deferrals}\n${pullCriteria}`.toLowerCase();

    expect(scopedText).toContain("no method backlog/status");
    expect(scopedText).toContain("method backlog/status/release surfaces");
    expect(scopedText).toMatch(/belong in method mcp\s*\/\s*method\s+cli/);
    expect(design.toLowerCase()).not.toContain("graft backlog");
    expect(design.toLowerCase()).not.toContain("graft retro");
  });

  it("Does the design preserve the shipped doctor and capability posture work as baseline, not work to reopen in this cycle?", () => {
    const design = readRepoFile("docs/design/CORE_v080-scope-formation.md");
    const baseline = markdownSection(design, "Shipped Baseline To Preserve");

    expect(baseline).toContain("`CORE_graft-doctor`");
    expect(baseline.toLowerCase()).toContain("shipped repo-generic health posture");
    expect(baseline).toContain("`CORE_three-surface-capability-baseline-and-parity-matrix`");
    expect(baseline).toContain("`CORE_release-gate-for-three-surface-capability-posture`");
  });
});
