import { describe, expect, it } from "vitest";

import { CanonicalJsonCodec } from "../../../src/adapters/canonical-json.js";
import {
  CAPABILITY_REGISTRY,
  MCP_TOOL_NAMES,
} from "../../../src/contracts/capabilities.js";
import {
  buildMcpCapabilityDiscovery,
  MCP_CAPABILITY_FAMILIES,
  MCP_CAPABILITY_FAMILY_DETAIL_MAX_BYTES,
  MCP_CAPABILITY_FAMILY_DEFINITIONS,
  MCP_CAPABILITY_SUMMARY_MAX_BYTES,
  MCP_DAEMON_ONLY_TOOLS,
  mcpCapabilityDiscoveryBodySchema,
  type McpCapabilityDiscoveryBody,
  type McpCapabilityFamily,
} from "../../../src/contracts/mcp-capability-discovery.js";
import { emptyBurdenByKind } from "../../../src/mcp/burden.js";
import { MetricsSnapshot } from "../../../src/mcp/metrics.js";
import { buildReceiptResult } from "../../../src/mcp/receipt.js";
import {
  ALL_TOOL_REGISTRY,
  DAEMON_TOOL_REGISTRY,
  TOOL_REGISTRY,
} from "../../../src/mcp/tool-registry.js";

function codePointOrder(left: string, right: string): number {
  const leftPoints = Array.from(left, (value) => value.codePointAt(0) ?? 0);
  const rightPoints = Array.from(right, (value) => value.codePointAt(0) ?? 0);
  const commonLength = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < commonLength; index += 1) {
    const difference = (leftPoints[index] ?? 0) - (rightPoints[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return leftPoints.length - rightPoints.length;
}

function sorted(values: readonly string[]): readonly string[] {
  return [...values].sort(codePointOrder);
}

function encodedBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

const codec = new CanonicalJsonCodec();

function completeCompactResponseBytes(body: McpCapabilityDiscoveryBody): number {
  return buildReceiptResult("capabilities", body, {
    sessionId: "capability-contract-session",
    traceId: "capability-contract-receipt",
    seq: 1,
    latencyMs: 0,
    metrics: new MetricsSnapshot({
      reads: 0,
      outlines: 0,
      refusals: 0,
      cacheHits: 0,
      bytesReturned: 0,
      bytesAvoided: 0,
      burdenByKind: emptyBurdenByKind(),
    }),
    tripwires: [],
    codec,
    receiptMode: "compact",
  }).textBytes;
}

describe("MCP capability discovery contract", () => {
  it("assigns every registered MCP tool to exactly one family", () => {
    const familyTools = MCP_CAPABILITY_FAMILY_DEFINITIONS.flatMap((definition) => definition.tools);

    expect(new Set(familyTools).size).toBe(familyTools.length);
    expect(sorted(familyTools)).toEqual(sorted(MCP_TOOL_NAMES));
    expect(sorted(ALL_TOOL_REGISTRY.map((tool) => tool.name))).toEqual(sorted(MCP_TOOL_NAMES));
  });

  it("keeps runtime filtering checked against the authoritative tool registries", () => {
    expect(sorted(MCP_DAEMON_ONLY_TOOLS)).toEqual(
      sorted(DAEMON_TOOL_REGISTRY.map((tool) => tool.name)),
    );

    const repoSummary = buildMcpCapabilityDiscovery({ sessionMode: "repo_local" });
    const daemonSummary = buildMcpCapabilityDiscovery({ sessionMode: "daemon" });
    expect(repoSummary.projection).toBe("summary");
    expect(daemonSummary.projection).toBe("summary");
    if (repoSummary.projection !== "summary" || daemonSummary.projection !== "summary") return;

    expect(repoSummary.registeredToolCount).toBe(34);
    expect(repoSummary.registeredToolCount).toBe(TOOL_REGISTRY.length);
    expect(daemonSummary.registeredToolCount).toBe(48);
    expect(daemonSummary.registeredToolCount).toBe(ALL_TOOL_REGISTRY.length);
    expect(repoSummary.families.map((family) => family.toolCount)).toEqual([5, 4, 4, 4, 8, 3, 6]);
    expect(daemonSummary.families.map((family) => family.toolCount)).toEqual([5, 18, 4, 4, 8, 3, 6]);

    const repoToolNames = new Set(TOOL_REGISTRY.map((tool) => tool.name));
    for (const definition of MCP_CAPABILITY_FAMILY_DEFINITIONS) {
      expect(repoToolNames.has(definition.openingCall)).toBe(true);
    }
  });

  it("derives family-detail descriptions from the capability registry", () => {
    const descriptions = new Map(
      CAPABILITY_REGISTRY.flatMap((capability) => (
        capability.mcpTool === undefined
          ? []
          : [[capability.mcpTool, capability.description] as const]
      )),
    );

    expect(descriptions.size).toBe(MCP_TOOL_NAMES.length);
    for (const family of MCP_CAPABILITY_FAMILIES) {
      const detail = buildMcpCapabilityDiscovery({ sessionMode: "daemon", family });
      expect(detail.projection).toBe("family_detail");
      if (detail.projection !== "family_detail") continue;
      for (const tool of detail.tools) {
        expect(tool.description).toBe(descriptions.get(tool.name));
      }
    }
  });

  it("returns the fixed summary order and opening calls without description sludge", () => {
    const summary = buildMcpCapabilityDiscovery({ sessionMode: "repo_local" });

    expect(summary).toMatchObject({
      projection: "summary",
      reason: "CAPABILITY_SUMMARY",
      discoveryBasis: "registered_surface",
      sessionMode: "repo_local",
      registeredToolCount: 34,
    });
    expect(summary.projection).toBe("summary");
    if (summary.projection !== "summary") return;

    expect(summary.families.map((entry) => entry.family)).toEqual(MCP_CAPABILITY_FAMILIES);
    expect(summary.families.map((entry) => entry.openingCall)).toEqual([
      "capabilities",
      "workspace_status",
      "safe_read",
      "code_find",
      "graft_since",
      "graft_review",
      "doctor",
    ]);
    for (const entry of summary.families) {
      expect(Object.keys(entry).sort()).toEqual([
        "family",
        "guidance",
        "openingCall",
        "toolCount",
      ]);
    }
    expect(mcpCapabilityDiscoveryBodySchema.parse(summary)).toEqual(summary);
  });

  it("returns only the selected family with opening-call-first deterministic ordering", () => {
    const repoWorkspace = buildMcpCapabilityDiscovery({
      sessionMode: "repo_local",
      family: "workspace",
    });
    const daemonWorkspace = buildMcpCapabilityDiscovery({
      sessionMode: "daemon",
      family: "workspace",
    });

    expect(repoWorkspace).toMatchObject({
      projection: "family_detail",
      reason: "CAPABILITY_FAMILY_DETAIL",
      discoveryBasis: "registered_surface",
      sessionMode: "repo_local",
      registeredToolCount: 34,
      family: "workspace",
      openingCall: "workspace_status",
      toolCount: 4,
    });
    expect(repoWorkspace.projection).toBe("family_detail");
    expect(daemonWorkspace.projection).toBe("family_detail");
    if (repoWorkspace.projection !== "family_detail" || daemonWorkspace.projection !== "family_detail") {
      return;
    }

    expect(repoWorkspace.tools.map((tool) => tool.name)).toEqual([
      "workspace_status",
      "causal_attach",
      "workspace_list_opened",
      "workspace_open",
    ]);
    expect(daemonWorkspace.tools[0]?.name).toBe("workspace_status");
    expect(daemonWorkspace.tools.slice(1).map((tool) => tool.name)).toEqual(
      sorted(daemonWorkspace.tools.slice(1).map((tool) => tool.name)),
    );
    expect(daemonWorkspace.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([...MCP_DAEMON_ONLY_TOOLS]),
    );

    for (const family of MCP_CAPABILITY_FAMILIES) {
      const detail = buildMcpCapabilityDiscovery({ sessionMode: "daemon", family });
      expect(detail.projection).toBe("family_detail");
      if (detail.projection !== "family_detail") continue;
      expect(detail.tools[0]?.name).toBe(detail.openingCall);
      expect(detail.tools.slice(1).map((tool) => tool.name)).toEqual(
        sorted(detail.tools.slice(1).map((tool) => tool.name)),
      );
      expect(detail.toolCount).toBe(detail.tools.length);
      expect(mcpCapabilityDiscoveryBodySchema.parse(detail)).toEqual(detail);
    }
  });

  it("keeps complete canonical compact responses within their byte budgets", () => {
    for (const sessionMode of ["repo_local", "daemon"] as const) {
      const summary = buildMcpCapabilityDiscovery({ sessionMode });
      expect(encodedBytes(summary)).toBeLessThanOrEqual(MCP_CAPABILITY_SUMMARY_MAX_BYTES);
      expect(completeCompactResponseBytes(summary)).toBeLessThanOrEqual(
        MCP_CAPABILITY_SUMMARY_MAX_BYTES,
      );

      for (const family of MCP_CAPABILITY_FAMILIES) {
        const detail = buildMcpCapabilityDiscovery({ sessionMode, family });
        expect(encodedBytes(detail)).toBeLessThanOrEqual(MCP_CAPABILITY_FAMILY_DETAIL_MAX_BYTES);
        expect(completeCompactResponseBytes(detail)).toBeLessThanOrEqual(
          MCP_CAPABILITY_FAMILY_DETAIL_MAX_BYTES,
        );
      }
    }
  });

  it("keeps the shared body schema strict across both projections", () => {
    const summary = buildMcpCapabilityDiscovery({ sessionMode: "daemon" });
    const detail = buildMcpCapabilityDiscovery({
      sessionMode: "daemon",
      family: "code" as McpCapabilityFamily,
    });

    expect(mcpCapabilityDiscoveryBodySchema.safeParse({ ...summary, unexpected: true }).success).toBe(false);
    expect(mcpCapabilityDiscoveryBodySchema.safeParse({ ...detail, families: [] }).success).toBe(false);
  });
});
