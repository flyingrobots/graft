import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { createGraftServer } from "../../../src/mcp/server.js";
import { createTestRepo, cleanupTestRepo, git } from "../../helpers/git.js";
import { parse } from "../../helpers/mcp.js";
import { MAX_MAP_FILES, MAX_MAP_BYTES } from "../../../src/mcp/tools/map.js";

function createServerInRepo(repoDir: string) {
  return createGraftServer({
    projectRoot: repoDir,
    graftDir: path.join(repoDir, ".graft"),
  });
}

describe("graft_map truncation", () => {
  it("truncates to summary-only when file count exceeds MAX_MAP_FILES", async () => {
    const tmpDir = createTestRepo("graft-map-truncation-files-");
    try {
      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });

      // Create more files than MAX_MAP_FILES with parseable content.
      const fileCount = MAX_MAP_FILES + 20;
      for (let i = 0; i < fileCount; i++) {
        fs.writeFileSync(
          path.join(tmpDir, "src", `mod${String(i).padStart(4, "0")}.ts`),
          `export function fn${String(i)}(): void {}\n`,
        );
      }
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("graft_map", { path: "src" }));

      expect(result["truncated"]).toBe(true);
      expect(result["truncatedReason"]).toBe("OUTPUT_LIMIT");
      expect(result["files"]).toEqual([]);
      expect(result["next"]).toBeDefined();
      expect(result["summary"]).toContain(String(fileCount));
      expect(result["summary"]).toContain("symbols");
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("truncates to summary-only when response bytes exceed MAX_MAP_BYTES", async () => {
    const tmpDir = createTestRepo("graft-map-truncation-bytes-");
    try {
      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });

      // Create fewer files than MAX_MAP_FILES but with many symbols each
      // so the serialized output exceeds MAX_MAP_BYTES.
      const filesNeeded = Math.min(MAX_MAP_FILES - 1, 30);
      const symbolsPerFile = Math.ceil(MAX_MAP_BYTES / (filesNeeded * 80)) + 10;
      for (let i = 0; i < filesNeeded; i++) {
        const symbols = Array.from(
          { length: symbolsPerFile },
          (_, j) => `export function longFunctionNameForBytePadding_${String(i)}_${String(j)}(): void {}\n`,
        ).join("");
        fs.writeFileSync(
          path.join(tmpDir, "src", `big${String(i).padStart(3, "0")}.ts`),
          symbols,
        );
      }
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("graft_map", { path: "src" }));

      expect(result["truncated"]).toBe(true);
      expect(result["truncatedReason"]).toBe("OUTPUT_LIMIT");
      expect(result["files"]).toEqual([]);
      expect(result["next"]).toEqual(expect.arrayContaining([
        expect.stringContaining("Narrow the path"),
      ]));
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("returns summary-only with BUDGET_EXHAUSTED when session budget is drained", async () => {
    const tmpDir = createTestRepo("graft-map-budget-exhausted-");
    try {
      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, "src", "hello.ts"),
        "export function hello(): string { return 'hi'; }\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      const server = createServerInRepo(tmpDir);

      // Set a tiny budget then exhaust it via safe_read.
      await server.callTool("set_budget", { bytes: 1 });
      // Read a file to consume the budget.
      await server.callTool("safe_read", { path: path.join(tmpDir, "src", "hello.ts") });

      const result = parse(await server.callTool("graft_map", { path: "src" }));

      expect(result["truncated"]).toBe(true);
      expect(result["truncatedReason"]).toBe("BUDGET_EXHAUSTED");
      expect(result["files"]).toEqual([]);
      expect(result["summary"]).toContain("budget exhausted");
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("does not truncate when within limits", async () => {
    const tmpDir = createTestRepo("graft-map-no-truncation-");
    try {
      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, "src", "small.ts"),
        "export const x = 1;\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("graft_map", { path: "src" }));

      expect(result["truncated"]).toBeUndefined();
      expect(result["truncatedReason"]).toBeUndefined();
      expect(result["files"]).toHaveLength(1);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });
});
