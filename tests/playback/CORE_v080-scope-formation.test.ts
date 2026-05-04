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

describe("CORE_v080-scope-formation playback", () => {
  it("Can a human see that this cycle forms v0.8.0 scope instead of shipping runtime behavior?", () => {
    const design = readRepoFile("docs/design/CORE_v080-scope-formation.md");

    expect(design).toContain("Settle the opening v0.8.0 lane before pulling more feature work");
    expect(design).toContain("Repo-generic operational truth surfaces for any Git repository");
    expect(design).toContain("Add runtime behavior");
  });

  it("Can a human identify the first implementation pull candidate and the follow-up candidates?", () => {
    const design = readRepoFile("docs/design/CORE_v080-scope-formation.md");

    expect(design).toContain("First implementation pull");
    expect(design).toContain("`CORE_pr-review-structural-summary`");
    expect(design).toContain("`CORE_structural-test-coverage-map`");
    expect(design).toContain("`SURFACE_review-cooldown-status`");
    expect(repoFileExists("docs/method/backlog/asap/CORE_pr-review-structural-summary.md")).toBe(true);
    expect(repoFileExists("docs/method/backlog/cool-ideas/CORE_structural-test-coverage-map.md")).toBe(true);
  });

  it("Can a human see which tempting work is explicitly deferred from the opening v0.8.0 lane?", () => {
    const design = readRepoFile("docs/design/CORE_v080-scope-formation.md");

    expect(design).toContain("## Explicit Deferrals");
    expect(design).toContain("`WARP_lsp-enrichment` continuation");
    expect(design).toContain("`CORE_migrate-to-slice-first-reads`");
    expect(design).toContain("git-warp observer geometry APIs");
    expect(design).toContain("`SURFACE_bijou-daemon-control-plane-actions`");
  });

  it("Does the scope decision mechanically agree with the current `docs/BEARING.md` next target?", () => {
    const bearing = readRepoFile("docs/BEARING.md");
    const design = readRepoFile("docs/design/CORE_v080-scope-formation.md");

    expect(bearing).toContain("The immediate focus is **v0.8.0 scope formation**, not feature work.");
    expect(bearing).toContain("repo-generic operational truth surfaces");
    expect(bearing).toContain("Keep `WARP_lsp-enrichment` and `CORE_migrate-to-slice-first-reads`");
    expect(design).toContain("The opening v0.8.0 lane is:");
    expect(design).toContain("Repo-generic operational truth surfaces for any Git repository");
  });

  it("Does the design keep METHOD backlog/status features out of Graft?", () => {
    const design = readRepoFile("docs/design/CORE_v080-scope-formation.md");

    expect(design).toContain("No METHOD backlog/status");
    expect(design).toContain("METHOD backlog/status/release surfaces");
    expect(design).toContain("Belong in Method MCP / Method CLI");
    expect(design).not.toContain("graft backlog");
    expect(design).not.toContain("graft retro");
  });

  it("Does the design preserve the shipped doctor and capability posture work as baseline, not work to reopen in this cycle?", () => {
    const design = readRepoFile("docs/design/CORE_v080-scope-formation.md");

    expect(design).toContain("## Shipped Baseline To Preserve");
    expect(design).toContain("`CORE_graft-doctor`");
    expect(design).toContain("Shipped repo-generic health posture");
    expect(design).toContain("`CORE_three-surface-capability-baseline-and-parity-matrix`");
    expect(design).toContain("`CORE_release-gate-for-three-surface-capability-posture`");
  });
});
