import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import {
  buildCapabilityMatrixRows,
  buildThreeSurfaceCapabilityBaseline,
} from "../../src/contracts/capabilities.js";

const repoRoot = resolve(import.meta.dirname, "../..");

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("0086 release gate for three-surface capability posture", () => {
  it("Can a targeted release gate prove the documented three-surface capability matrix still matches the capability registry baseline and row set?", () => {
    const matrixDoc = readRepoFile("docs/three-surface-capability-matrix.md");
    const baseline = buildThreeSurfaceCapabilityBaseline();

    expect(matrixDoc).toContain(`- \`${String(baseline.cliOnly)}\` CLI-only capabilities`);
    expect(matrixDoc).toContain(`- \`${String(baseline.apiCliMcp)}\` API + CLI + MCP capabilities`);
    expect(matrixDoc).toContain(`- \`${String(baseline.apiMcp)}\` API + MCP capabilities`);
    expect(matrixDoc).toContain(`- \`${String(baseline.apiOnly)}\` API-only capability`);

    for (const row of buildCapabilityMatrixRows()) {
      expect(matrixDoc).toContain(
        `| \`${row.id}\` | ${row.api} | ${row.cli} | ${row.mcp} | \`${row.apiExposure}\` | \`${row.cliMcpParity}\` | \`${row.cliPath}\` | \`${row.mcpTool}\` |`,
      );
    }
  });

  it("Does release guidance explicitly require the three-surface posture gate before another version ships?", () => {
    const releaseDoc = readRepoFile("docs/method/release.md");
    const runbookDoc = readRepoFile("docs/method/release-runbook.md");

    expect(releaseDoc).toContain("## Three-surface posture gate");
    expect(runbookDoc).toContain("`pnpm release:surface-gate`");
  });

  it("Does the release gate keep the public API contract and three-surface matrix in the same review loop instead of treating API drift as incidental?", () => {
    const releaseDoc = readRepoFile("docs/method/release.md");
    const runbookDoc = readRepoFile("docs/method/release-runbook.md");
    const invariantDoc = readRepoFile("docs/invariants/release-gates-three-surface-capability-posture.md");

    expect(packageJson.scripts["release:check"]).toContain("pnpm release:surface-gate");
    expect(releaseDoc).toContain("docs/public-api.md");
    expect(runbookDoc).toContain("docs/public-api.md");
    expect(invariantDoc).toContain("docs/public-api.md");
  });
});
