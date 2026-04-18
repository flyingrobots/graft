import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const designDocPath = path.join(
  repoRoot,
  "docs/design/CORE_hexagonal-architecture-convergence-plan.md",
);
const architectureDocPath = path.join(repoRoot, "ARCHITECTURE.md");
const designDoc = fs.readFileSync(designDocPath, "utf-8");
const architectureDoc = fs.readFileSync(architectureDocPath, "utf-8");

function expectMentions(text: string, terms: string[]) {
  for (const term of terms) {
    expect(text).toContain(term);
  }
}

describe("0075 playback: hexagonal architecture convergence plan", () => {
  it("Can a human explain the target layer map: contracts, application/use cases, ports, secondary adapters, and primary adapters/composition roots?", () => {
    expectMentions(designDoc, [
      "## Target architecture",
      "#### 1. Contracts and pure value models",
      "#### 2. Application and use-case services",
      "#### 3. Ports",
      "#### 4. Secondary adapters",
      "#### 5. Primary adapters and composition roots",
    ]);
  });

  it("Can a human explain what must move out of `src/mcp/` and `src/cli/` versus what is allowed to stay at the edge?", () => {
    expectMentions(designDoc, [
      "tool handlers and CLI commands should stop being alternate homes for",
      "`src/mcp/tools/**` and `src/cli/**` should validate input, call one",
      "`src/mcp/server.ts` should become composition-root wiring",
      "`src/mcp/workspace-router.ts` should stop being a mixed router",
    ]);
  });

  it("Is it explicit why `ARCHITECTURE.md` currently overclaims strict hexagonal posture?", () => {
    expect(architectureDoc).toContain("strict Hexagonal (Ports and Adapters) architecture");
    expectMentions(designDoc, [
      "the public architecture doc says “strict Hexagonal (Ports and",
      "docs stop overclaiming strict hex posture before repo truth earns it",
      "[CLEAN_architecture-doc-overclaims-strict-hexagonal-posture.md]",
    ]);
  });

  it("Is the next execution queue concrete enough to choose the next architecture slice without re-planning the whole repo?", () => {
    expectMentions(designDoc, [
      "### Slice 1: Layer map and dependency guardrails",
      "### Slice 2: Thin primary adapters and use-case extraction",
      "### Slice 3: WARP port and adapter boundary",
      "### Slice 4: Composition roots for CLI, MCP, daemon, and hooks",
      "### Slice 5: Runtime-validated command and context models",
    ]);
  });

  it("Does the packet name the dependency rules tightly enough to enforce with tooling rather than taste?", () => {
    expectMentions(designDoc, [
      "## Dependency rules",
      "`contracts <- application -> ports <- adapters`",
      "`src/application/**` must not import from `src/mcp/**`",
      "`src/application/**` must not import from `src/adapters/**`",
      "WARP access should enter through one graph port",
    ]);
  });

  it("Does the packet make the WARP boundary explicit as a first-class port/adaptor problem rather than a loose cast problem?", () => {
    expectMentions(designDoc, [
      "Missing architecture-critical port:",
      "a first-class WARP graph port",
      "no more “ambient WARP” posture inside application logic",
      "[CORE_warp-port-and-adapter-boundary.md]",
    ]);
  });

  it("Does the packet map the major current hotspots (`server.ts`, `workspace-router.ts`, persisted local history, repo state, runtime observability, parser/operations hotspots) into migration slices instead of leaving them as a complaint list?", () => {
    expectMentions(designDoc, [
      "## Current hotspot mapping",
      "`src/mcp/server.ts`",
      "`src/mcp/workspace-router.ts`",
      "`src/mcp/persisted-local-history.ts`",
      "`src/mcp/repo-state.ts`",
      "`src/mcp/runtime-observability.ts`",
    ]);
  });

  it("Does the packet turn the missing architecture slices into real backlog items with sequencing, not just prose?", () => {
    // These backlog items have been completed — verify landed design docs exist
    const completedDesignDocs = [
      "docs/design/CORE_hex-layer-map-and-dependency-guardrails.md",
      "docs/design/CORE_primary-adapters-thin-use-case-extraction.md",
      "docs/design/CORE_warp-port-and-adapter-boundary.md",
      "docs/design/CORE_composition-roots-for-cli-mcp-daemon-and-hooks.md",
      "docs/design/CORE_runtime-validated-command-and-context-models.md",
    ];

    for (const relativePath of completedDesignDocs) {
      expect(fs.existsSync(path.join(repoRoot, relativePath))).toBe(true);
    }

    // Verify the design doc references the original backlog item names
    const backlogBasenames = [
      "CORE_hex-layer-map-and-dependency-guardrails.md",
      "CORE_primary-adapters-thin-use-case-extraction.md",
      "CORE_warp-port-and-adapter-boundary.md",
      "CORE_composition-roots-for-cli-mcp-daemon-and-hooks.md",
      "CORE_runtime-validated-command-and-context-models.md",
      "CLEAN_architecture-doc-overclaims-strict-hexagonal-posture.md",
    ];

    for (const basename of backlogBasenames) {
      expect(designDoc).toContain(basename);
    }
  });
});
