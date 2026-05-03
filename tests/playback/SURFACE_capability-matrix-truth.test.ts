import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CAPABILITY_REGISTRY } from "../../src/contracts/capabilities.js";

const repoRoot = resolve(import.meta.dirname, "../..");

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("SURFACE capability matrix truth playback", () => {
  it("Can a human tell the difference between direct CLI/MCP peer commands, composed CLI operator/lifecycle commands, and intentionally API+MCP-only agent/control-plane tools?", () => {
    const matrixDoc = readRepoFile("docs/three-surface-capability-matrix.md");

    expect(matrixDoc).toContain("`peer`: the CLI command is a direct peer for the MCP tool");
    expect(matrixDoc).toContain("`composed_cli_operator`: the CLI command is a human/operator surface");
    expect(matrixDoc).toContain("`mcp_only`: intentionally API + MCP-only agent/control-plane tool");
  });

  it("Does the `daemon_status` row tell the truth that `graft daemon status` exists as a composed CLI operator surface?", () => {
    const matrixDoc = readRepoFile("docs/three-surface-capability-matrix.md");

    expect(matrixDoc).toContain(
      "| `daemon_status` | Yes | Yes | Yes | `tool_bridge` | `composed_cli_operator` | `daemon status` | `daemon_status` |",
    );
  });

  it("Is it clear that `graft serve`, `graft serve --runtime daemon`, and `graft daemon` are host/runtime launch commands documented in the CLI guide rather than capability rows?", () => {
    const cliDoc = readRepoFile("docs/CLI.md");
    const matrixDoc = readRepoFile("docs/three-surface-capability-matrix.md");

    expect(cliDoc).toContain("graft serve --runtime daemon");
    expect(cliDoc).toContain("graft daemon status");
    expect(matrixDoc).toContain("Pure host/runtime launch commands such as `graft serve`");
    expect(matrixDoc).toMatch(/documented in the\s+CLI guide rather than as matrix capability rows/);
  });

  it("Does the capability registry expose `daemon_status` on API, CLI, and MCP with `composed_cli_operator` posture and `daemon status` as its CLI path?", () => {
    const daemonStatus = CAPABILITY_REGISTRY.find((capability) => capability.id === "daemon_status");

    expect(daemonStatus).toMatchObject({
      surfaces: ["api", "cli", "mcp"],
      cliMcpParity: "composed_cli_operator",
      cliPath: ["daemon", "status"],
      mcpTool: "daemon_status",
    });
    expect(daemonStatus?.cliCommand).toBeUndefined();
  });

  it("Do release-gate tests fail if the documented matrix hides a composed CLI operator command as MCP-only?", () => {
    const releaseGateTest = readRepoFile("test/unit/release/three-surface-capability-posture.test.ts");

    expect(releaseGateTest).toContain("keeps composed CLI operator commands from being hidden as MCP-only");
    expect(releaseGateTest).toContain("composed_cli_operator");
    expect(releaseGateTest).toContain("daemon status");
  });

  it("Do tests prove the intentionally API+MCP-only tools were not converted into direct CLI peers?", () => {
    const intentionallyApiMcpOnly = CAPABILITY_REGISTRY.filter((capability) => capability.cliMcpParity === "mcp_only");

    expect(intentionallyApiMcpOnly).toHaveLength(22);
    expect(intentionallyApiMcpOnly.every((capability) => capability.cliCommand === undefined)).toBe(true);
    expect(intentionallyApiMcpOnly.every((capability) => capability.cliPath === undefined)).toBe(true);
    expect(CAPABILITY_REGISTRY.find((capability) => capability.id === "daemon_status")?.cliCommand).toBeUndefined();
  });
});
