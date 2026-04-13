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
    const result = parse(await server.callTool("graft_map", { path: "src", depth: 0 }));

    const files = result["files"] as { path: string }[];
    const directories = result["directories"] as {
      path: string;
      fileCount: number;
      symbolCount: number;
      childDirectoryCount: number;
      summaryOnly: true;
    }[];

    expect(result["mode"]).toEqual({ depth: 0, summary: false });
    expect(files).toEqual([
      expect.objectContaining({ path: "src/top.ts" }),
    ]);
    expect(directories).toEqual([
      expect.objectContaining({
        path: "src/components",
        fileCount: 2,
        symbolCount: 2,
        childDirectoryCount: 1,
        summaryOnly: true,
      }),
    ]);

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
    const result = parse(await server.callTool("graft_map", { path: "src", summary: true }));

    const files = result["files"] as {
      path: string;
      symbolCount: number;
      summaryOnly: boolean;
      symbols?: { name: string }[];
    }[];

    expect(result["mode"]).toEqual({ depth: null, summary: true });
    expect(files).toEqual([
      expect.objectContaining({
        path: "src/tracked.ts",
        symbolCount: 2,
        summaryOnly: true,
      }),
    ]);
    expect(files[0] && "symbols" in files[0]).toBe(false);

    return result;
  } finally {
    cleanupTestRepo(tmpDir);
  }
}
