import * as fs from "node:fs";
import * as path from "node:path";
import { expect } from "vitest";
import { cleanupTestRepo, createTestRepo, git } from "./git.js";
import { createServerInRepo, parse } from "./mcp.js";

export async function expectGraftMapDepthOverviewPlayback(): Promise<Record<string, unknown>> {
  const tmpDir = createTestRepo("graft-map-overview-playback-depth-");
  try {
    fs.mkdirSync(path.join(tmpDir, "src", "components", "forms"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "src", "top.ts"), "export const top = true;\n");
    fs.writeFileSync(path.join(tmpDir, "src", "components", "button.ts"), "export const button = true;\n");
    fs.writeFileSync(path.join(tmpDir, "src", "components", "forms", "input.ts"), "export const input = true;\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m init");

    const server = createServerInRepo(tmpDir);
    const result = parse(await server.callTool("graft_map", { path: "src" }));

    const files = result["files"] as { path: string; symbols: { name: string }[] }[];

    expect(result["directory"]).toBe("src");
    // All files in the subtree are returned (no depth filtering)
    expect(files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "src/top.ts" }),
        expect.objectContaining({ path: "src/components/button.ts" }),
        expect.objectContaining({ path: "src/components/forms/input.ts" }),
      ]),
    );
    expect(result["summary"]).toBeDefined();

    return result;
  } finally {
    cleanupTestRepo(tmpDir);
  }
}

export async function expectGraftMapSummaryPlayback(): Promise<Record<string, unknown>> {
  const tmpDir = createTestRepo("graft-map-overview-playback-summary-");
  try {
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "src", "tracked.ts"),
      "export const tracked = true;\nexport function greet(): string { return \"hi\"; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m init");

    const server = createServerInRepo(tmpDir);
    const result = parse(await server.callTool("graft_map", { path: "src" }));

    const files = result["files"] as {
      path: string;
      symbols: { name: string }[];
    }[];

    expect(result["directory"]).toBe("src");
    expect(files).toEqual([
      expect.objectContaining({
        path: "src/tracked.ts",
      }),
    ]);
    // Symbols are included in the response (no summary-only mode)
    expect(files[0]?.symbols).toHaveLength(2);
    expect(result["summary"]).toBeDefined();

    return result;
  } finally {
    cleanupTestRepo(tmpDir);
  }
}
