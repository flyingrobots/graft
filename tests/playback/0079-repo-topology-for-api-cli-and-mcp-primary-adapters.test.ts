import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_TOPOLOGY_DOC = path.resolve(
  import.meta.dirname,
  "../../docs/repo-topology.md",
);
const TOPOLOGY_INVARIANT = path.resolve(
  import.meta.dirname,
  "../../docs/invariants/primary-adapter-repo-topology-explicit.md",
);
const ROOT_INDEX = path.resolve(import.meta.dirname, "../../src/index.ts");
const API_INDEX = path.resolve(import.meta.dirname, "../../src/api/index.ts");
const ESLINT_CONFIG = path.resolve(import.meta.dirname, "../../eslint.config.js");

function read(pathname: string): string {
  return fs.readFileSync(pathname, "utf-8");
}

describe("0079 repo topology for api cli and mcp primary adapters", () => {
  it("Can a human point to one repo-visible doc that names the explicit homes of the API, CLI, and MCP primary adapters?", () => {
    const content = read(REPO_TOPOLOGY_DOC);

    expect(content).toContain("`src/api/`");
    expect(content).toContain("`src/cli/`");
    expect(content).toContain("`src/mcp/`");
  });

  it("Can a human tell the difference between `src/index.ts` as the package export root and `src/api/` as the API adapter home?", () => {
    const content = read(REPO_TOPOLOGY_DOC);

    expect(content).toContain("`src/index.ts`");
    expect(content).toContain("package export root");
    expect(content).toContain("`src/api/`");
    expect(content).toContain("API primary adapter home");
  });

  it("Is the current role of `src/hooks/` obvious rather than confused with the three official product entry points?", () => {
    const content = read(REPO_TOPOLOGY_DOC);

    expect(content).toContain("`src/hooks/`");
    expect(content).toMatch(/not one of the\s+three official product surfaces/);
  });

  it("Does the source tree contain an explicit `src/api/` primary adapter home alongside `src/cli/` and `src/mcp/`?", () => {
    expect(fs.existsSync(API_INDEX)).toBe(true);
    expect(fs.existsSync(path.resolve(import.meta.dirname, "../../src/cli"))).toBe(true);
    expect(fs.existsSync(path.resolve(import.meta.dirname, "../../src/mcp"))).toBe(true);
  });

  it("Do lint guardrails treat `src/api/` as a primary-adapter boundary instead of leaving API invisible to the hex rules?", () => {
    const content = read(ESLINT_CONFIG);

    expect(content).toContain('"**/api"');
    expect(content).toContain('"**/api/**"');
    expect(content).toContain("primary adapters (api, cli, mcp, or hooks)");
  });

  it("Are the topology rules and exported surface mechanically witnessable in tests?", () => {
    const rootIndex = read(ROOT_INDEX).trim();
    const invariant = read(TOPOLOGY_INVARIANT);

    expect(rootIndex).toBe('export * from "./api/index.js";');
    expect(invariant).toContain("`src/api/`, `src/cli/`, and `src/mcp/`");
    expect(invariant).toContain("`src/index.ts`");
  });
});
