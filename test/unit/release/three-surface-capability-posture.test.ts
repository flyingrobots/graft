import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import packageJson from "../../../package.json";
import {
  buildCapabilityMatrixRows,
  buildThreeSurfaceCapabilityBaseline,
} from "../../../src/contracts/capabilities.js";

const repoRoot = resolve(import.meta.dirname, "../../..");

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function quoted(value: string): string {
  return `\`${value}\``;
}

describe("release: three-surface capability posture", () => {
  it("keeps the documented three-surface capability matrix aligned with the registry baseline", () => {
    const matrixDoc = readRepoFile("docs/three-surface-capability-matrix.md");
    const baseline = buildThreeSurfaceCapabilityBaseline();

    expect(matrixDoc).toContain(`- \`${String(baseline.cliOnly)}\` CLI-only capabilities`);
    expect(matrixDoc).toContain(`- \`${String(baseline.apiCliMcp)}\` API + CLI + MCP capabilities`);
    expect(matrixDoc).toContain(`- \`${String(baseline.apiMcp)}\` API + MCP capabilities`);
    expect(matrixDoc).toContain(`- \`${String(baseline.apiOnly)}\` API-only capability`);
    expect(matrixDoc).toContain(`- \`${String(baseline.directCliMcpPeers)}\` direct CLI/MCP peer capabilities`);
    expect(matrixDoc).toContain(
      `- \`${String(baseline.composedCliOperators)}\` composed CLI operator/lifecycle capability`,
    );
    expect(matrixDoc).toContain(
      `- \`${String(baseline.intentionallyApiMcpOnly)}\` intentionally API + MCP-only agent/control-plane capabilities`,
    );
  });

  it("keeps every documented matrix row aligned with the capability registry", () => {
    const matrixDoc = readRepoFile("docs/three-surface-capability-matrix.md");

    for (const row of buildCapabilityMatrixRows()) {
      expect(matrixDoc).toContain(
        `| ${quoted(row.id)} | ${row.api} | ${row.cli} | ${row.mcp} | ${quoted(row.apiExposure)} | ${quoted(row.cliMcpParity)} | ${quoted(row.cliPath)} | ${quoted(row.mcpTool)} |`,
      );
    }
  });

  it("keeps composed CLI operator commands from being hidden as MCP-only", () => {
    const cliDoc = readRepoFile("docs/CLI.md");
    const matrixDoc = readRepoFile("docs/three-surface-capability-matrix.md");

    expect(cliDoc).toContain("graft daemon status");
    expect(matrixDoc).toContain(
      "| `daemon_status` | Yes | Yes | Yes | `tool_bridge` | `composed_cli_operator` | `daemon status` | `daemon_status` |",
    );
  });

  it("makes three-surface posture a first-class release gate", () => {
    const releaseDoc = readRepoFile("docs/method/release.md");
    const runbookDoc = readRepoFile("docs/method/release-runbook.md");
    const invariantDoc = readRepoFile("docs/invariants/release-gates-three-surface-capability-posture.md");
    const publicApiDoc = readRepoFile("docs/public-api.md");

    expect(packageJson.scripts["release:surface-gate"]).toBe(
      "vitest run --run test/unit/release/package-library-surface.test.ts test/unit/release/three-surface-capability-posture.test.ts",
    );
    expect(packageJson.scripts["release:check"]).toContain("pnpm release:surface-gate");
    expect(releaseDoc).toContain("## Three-surface posture gate");
    expect(releaseDoc).toContain("docs/three-surface-capability-matrix.md");
    expect(releaseDoc).toContain("docs/public-api.md");
    expect(runbookDoc).toContain("`pnpm release:surface-gate`");
    expect(runbookDoc).toContain("docs/three-surface-capability-matrix.md");
    expect(runbookDoc).toContain("docs/public-api.md");
    expect(invariantDoc).toContain("pnpm release:surface-gate");
    expect(publicApiDoc).toContain("The root package export surface is public.");
  });
});
