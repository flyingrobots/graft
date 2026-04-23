import { describe, expect, it } from "vitest";
import {
  API_EXPOSED_CAPABILITIES,
  buildCapabilityMatrixRows,
  buildThreeSurfaceCapabilityBaseline,
  CAPABILITY_REGISTRY,
} from "../../../src/contracts/capabilities.js";

describe("capability registry", () => {
  it("treats API, CLI, and MCP as explicit entrypoint surfaces", () => {
    const byId = new Map(CAPABILITY_REGISTRY.map((capability) => [capability.id, capability]));

    expect(byId.get("safe_read")?.surfaces).toEqual(["api", "cli", "mcp"]);
    expect(byId.get("safe_read")?.apiExposure).toBe("repo_workspace");
    expect(byId.get("safe_read")?.cliMcpParity).toBe("peer");

    expect(byId.get("doctor")?.surfaces).toEqual(["api", "cli", "mcp"]);
    expect(byId.get("doctor")?.apiExposure).toBe("tool_bridge");

    expect(byId.get("local_history_dag")?.surfaces).toEqual(["cli"]);
    expect(byId.get("local_history_dag")?.cliMcpParity).toBe("cli_only");

    expect(byId.get("structured_buffer")?.surfaces).toEqual(["api"]);
    expect(byId.get("structured_buffer")?.apiExposure).toBe("structured_buffer");
    expect(byId.get("structured_buffer")?.cliMcpParity).toBe("not_applicable");
  });

  it("keeps declared CLI/MCP parity honest", () => {
    for (const capability of CAPABILITY_REGISTRY) {
      if (capability.cliMcpParity === "peer") {
        expect(capability.cliCommand).toBeDefined();
        expect(capability.mcpTool).toBeDefined();
        expect(capability.surfaces).toContain("cli");
        expect(capability.surfaces).toContain("mcp");
      }
      if (capability.cliMcpParity === "cli_only") {
        expect(capability.cliCommand).toBeDefined();
        expect(capability.mcpTool).toBeUndefined();
      }
      if (capability.cliMcpParity === "mcp_only") {
        expect(capability.cliCommand).toBeUndefined();
        expect(capability.mcpTool).toBeDefined();
      }
      if (capability.cliMcpParity === "not_applicable") {
        expect(capability.surfaces).toEqual(["api"]);
      }
    }
  });

  it("exposes the API surface as a first-class registry view", () => {
    expect(API_EXPOSED_CAPABILITIES.length).toBeGreaterThan(0);
    expect(API_EXPOSED_CAPABILITIES.every((capability) => capability.surfaces.includes("api"))).toBe(true);
  });

  it("derives the documented three-surface baseline and row model from the registry", () => {
    const baseline = buildThreeSurfaceCapabilityBaseline();
    const rows = buildCapabilityMatrixRows();

    expect(baseline).toEqual({
      cliOnly: 4,
      apiCliMcp: 19,
      apiMcp: 22,
      apiOnly: 1,
    });
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "safe_read",
        api: "Yes",
        cli: "Yes",
        mcp: "Yes",
        apiExposure: "repo_workspace",
        cliMcpParity: "peer",
        cliPath: "read safe",
        mcpTool: "safe_read",
      }),
      expect.objectContaining({
        id: "structured_buffer",
        api: "Yes",
        cli: "No",
        mcp: "No",
        apiExposure: "structured_buffer",
        cliMcpParity: "not_applicable",
        cliPath: "-",
        mcpTool: "-",
      }),
    ]));
  });
});
