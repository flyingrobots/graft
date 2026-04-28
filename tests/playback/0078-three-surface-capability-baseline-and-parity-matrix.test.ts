import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import {
  API_EXPOSED_CAPABILITIES,
  CAPABILITY_REGISTRY,
} from "../../src/contracts/capabilities.js";

const MATRIX_DOC = path.resolve(
  import.meta.dirname,
  "../../docs/three-surface-capability-matrix.md",
);

function readMatrixDoc(): string {
  return fs.readFileSync(MATRIX_DOC, "utf-8");
}

describe("0078 three-surface capability baseline and parity matrix", () => {
  it("Can a human answer “where is this capability available?” for API, CLI, and MCP from one matrix doc?", () => {
    const content = readMatrixDoc();

    expect(content).toContain("API");
    expect(content).toContain("CLI");
    expect(content).toContain("MCP");

    for (const capability of CAPABILITY_REGISTRY) {
      expect(content).toContain(`\`${capability.id}\``);
    }
  });

  it("Can a human tell the difference between direct typed API surfaces and tool-bridge API exposure?", () => {
    const content = readMatrixDoc();

    expect(content).toContain("`repo_workspace`");
    expect(content).toContain("`tool_bridge`");
    expect(content).toContain("`structured_buffer`");
    expect(content).toContain("| `safe_read` | Yes | Yes | Yes | `repo_workspace` | `peer` | `read safe` | `safe_read` |");
    expect(content).toContain("| `structured_buffer` | Yes | No | No | `structured_buffer` | `not_applicable` | `-` | `-` |");
  });

  it("Are the current CLI-only, MCP-only, and API-only exceptions obvious rather than surprising?", () => {
    const content = readMatrixDoc();

    expect(CAPABILITY_REGISTRY.filter((capability) => capability.surfaces.join("+") === "cli")).toHaveLength(5);
    expect(CAPABILITY_REGISTRY.filter((capability) => capability.surfaces.join("+") === "api+cli+mcp")).toHaveLength(20);
    expect(CAPABILITY_REGISTRY.filter((capability) => capability.surfaces.join("+") === "api+mcp")).toHaveLength(23);
    expect(CAPABILITY_REGISTRY.filter((capability) => capability.surfaces.join("+") === "api")).toHaveLength(1);
    expect(CAPABILITY_REGISTRY.filter((capability) => capability.surfaces.join("+") === "mcp")).toHaveLength(0);

    expect(content).toContain("- `5` CLI-only capabilities");
    expect(content).toContain("- `20` API + CLI + MCP capabilities");
    expect(content).toContain("- `23` API + MCP capabilities");
    expect(content).toContain("- `1` API-only capability");
  });

  it("Does the capability registry explicitly model all three entry points?", () => {
    const surfaces = new Set(CAPABILITY_REGISTRY.flatMap((capability) => capability.surfaces));

    expect(surfaces).toEqual(new Set(["api", "cli", "mcp"]));
    expect(CAPABILITY_REGISTRY.every((capability) => capability.surfaces.length >= 1)).toBe(true);
  });

  it("Is there one doc artifact whose rows stay in sync with the registry?", () => {
    const content = readMatrixDoc();

    for (const capability of CAPABILITY_REGISTRY) {
      expect(content).toContain(`\`${capability.id}\``);
    }
  });

  it("Are the current baseline counts and exceptions mechanically witnessable in tests?", () => {
    const content = readMatrixDoc();

    expect(API_EXPOSED_CAPABILITIES.some((capability) => capability.id === "structured_buffer")).toBe(true);
    expect(content).toContain("| `structured_buffer` | Yes | No | No | `structured_buffer` | `not_applicable` | `-` | `-` |");
    expect(content).toContain("| `safe_read` | Yes | Yes | Yes | `repo_workspace` | `peer` | `read safe` | `safe_read` |");
    expect(CAPABILITY_REGISTRY.filter((capability) => capability.surfaces.join("+") === "api")).toHaveLength(1);
    expect(CAPABILITY_REGISTRY.filter((capability) => capability.surfaces.join("+") === "cli")).toHaveLength(5);
  });
});
