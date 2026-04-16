import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createRepoWorkspace } from "../../src/index.js";
import { createCommittedTestRepo, cleanupTestRepo } from "../../test/helpers/git.js";
import { createServerInRepo, parse } from "../../test/helpers/mcp.js";

const MCP_CACHE = path.resolve(import.meta.dirname, "../../src/mcp/cache.ts");
const OPERATIONS_CACHE = path.resolve(import.meta.dirname, "../../src/operations/observation-cache.ts");
const MCP_CONTEXT = path.resolve(import.meta.dirname, "../../src/mcp/context.ts");
const MCP_POLICY = path.resolve(import.meta.dirname, "../../src/mcp/policy.ts");
const ADAPTER_REPO_PATHS = path.resolve(import.meta.dirname, "../../src/adapters/repo-paths.ts");
const READ_TOOL_FILES = [
  path.resolve(import.meta.dirname, "../../src/mcp/tools/safe-read.ts"),
  path.resolve(import.meta.dirname, "../../src/mcp/tools/file-outline.ts"),
  path.resolve(import.meta.dirname, "../../src/mcp/tools/read-range.ts"),
  path.resolve(import.meta.dirname, "../../src/mcp/tools/changed-since.ts"),
] as const;

function read(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

describe("0077 primary adapters thin use-case extraction", () => {
  let repoDir: string | null = null;

  afterEach(() => {
    if (repoDir !== null) {
      cleanupTestRepo(repoDir);
      repoDir = null;
    }
  });

  it("Can an external app create a repo-local workspace and call direct governed read methods without going through MCP receipts?", async () => {
    repoDir = createCommittedTestRepo("graft-0077-workspace-", {
      "app.ts": "export function greet(name: string): string {\n  return `hello ${name}`;\n}\n",
    });

    const workspace = await createRepoWorkspace({ cwd: repoDir });
    const first = await workspace.safeRead({ path: "app.ts" });
    const outline = await workspace.fileOutline({ path: "app.ts" });
    const range = await workspace.readRange({ path: "app.ts", start: 1, end: 2 });
    const changed = await workspace.changedSince({ path: "app.ts" });

    expect(first.projection).toBe("content");
    expect("outline" in outline).toBe(true);
    expect("content" in range).toBe(true);
    expect("status" in changed && changed.status).toBe("unchanged");
  });

  it("Do `safe_read`, `file_outline`, `read_range`, and `changed_since` still behave the same through the MCP surface after extraction?", async () => {
    repoDir = createCommittedTestRepo("graft-0077-mcp-", {
      "app.ts": "export function greet(name: string): string {\n  return `hello ${name}`;\n}\n",
    });

    const server = createServerInRepo(repoDir);
    const safeRead = parse(await server.callTool("safe_read", { path: "app.ts" }));
    const fileOutline = parse(await server.callTool("file_outline", { path: "app.ts" }));
    const readRange = parse(await server.callTool("read_range", { path: "app.ts", start: 1, end: 2 }));
    const changedSince = parse(await server.callTool("changed_since", { path: "app.ts" }));

    expect(safeRead["projection"]).toBe("content");
    expect(fileOutline["outline"]).toBeDefined();
    expect(readRange["content"]).toBeDefined();
    expect(changedSince["status"]).toBe("unchanged");
  });

  it("Is the observation cache still outside the `mcp` adapter?", () => {
    expect(fs.existsSync(OPERATIONS_CACHE)).toBe(true);
    expect(read(MCP_CACHE)).toContain('../operations/observation-cache.js');
  });

  it("Is path resolution still outside the `mcp` adapter?", () => {
    expect(fs.existsSync(ADAPTER_REPO_PATHS)).toBe(true);
    expect(read(MCP_CONTEXT)).not.toContain("function createPathResolver");
    expect(read(MCP_POLICY)).toContain('../adapters/repo-paths.js');
  });

  it("Are the read-family tool handlers thinner after the slice?", () => {
    for (const filePath of READ_TOOL_FILES) {
      const content = read(filePath);
      expect(content).toContain("createRepoWorkspaceFromToolContext");
      expect(content).not.toContain("new RepoWorkspace(");
    }
  });
});
