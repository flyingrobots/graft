import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { createTestRepo, cleanupTestRepo, git } from "../../test/helpers/git.js";
import { createServerInRepo, parse } from "../../test/helpers/mcp.js";

describe("0069 graft_map bounded overview playback", () => {
  it("graft_map depth 0 returns direct files and summarized child directories for one-call orientation", async () => {
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
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("graft_map summary mode reports symbol counts without emitting per-symbol payloads", async () => {
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
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });
});
