import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";
import { createIndexableServerInRepo, parse } from "../../helpers/mcp.js";

describe("mcp: graft_blame", () => {
  it("returns per-version path and line ranges for symbol history entries", async () => {
    const repoDir = createTestRepo("graft-blame-history-location-");
    try {
      const indexed = createIndexableServerInRepo(repoDir);
      fs.writeFileSync(
        path.join(repoDir, "api.ts"),
        "export function buildThing(): string {\n  return 'v1';\n}\n",
      );
      git(repoDir, "add -A");
      git(repoDir, "commit -m add-build-thing");
      await indexed.indexCurrentHead();

      fs.writeFileSync(
        path.join(repoDir, "api.ts"),
        "export function buildThing(input: string): string {\n  return input;\n}\n",
      );
      git(repoDir, "add -A");
      git(repoDir, "commit -m change-build-thing");
      await indexed.indexCurrentHead();

      const server = indexed.server;
      const result = parse(await server.callTool("graft_blame", {
        symbol: "buildThing",
        path: "api.ts",
      }));

      const history = result["history"] as {
        path?: string;
        startLine?: number;
        endLine?: number;
      }[];
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual(expect.objectContaining({
        path: "api.ts",
        startLine: 1,
        endLine: 3,
      }));
      expect(history[1]).toEqual(expect.objectContaining({
        path: "api.ts",
        startLine: 1,
        endLine: 3,
      }));
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("keeps paths on removed history entries without requiring line ranges", async () => {
    const repoDir = createTestRepo("graft-blame-history-removed-location-");
    try {
      const indexed = createIndexableServerInRepo(repoDir);
      fs.writeFileSync(path.join(repoDir, "removed.ts"), "export function gone(): void {}\n");
      git(repoDir, "add -A");
      git(repoDir, "commit -m add-gone");
      await indexed.indexCurrentHead();

      fs.writeFileSync(path.join(repoDir, "removed.ts"), "// gone\n");
      git(repoDir, "add -A");
      git(repoDir, "commit -m remove-gone");
      await indexed.indexCurrentHead();

      const server = indexed.server;
      const result = parse(await server.callTool("graft_blame", {
        symbol: "gone",
        path: "removed.ts",
      }));

      const history = result["history"] as {
        changeKind: string;
        path?: string;
        startLine?: number;
        endLine?: number;
      }[];
      expect(history).toHaveLength(2);
      expect(history[1]).toEqual(expect.objectContaining({
        changeKind: "removed",
        path: "removed.ts",
      }));
      expect(history[1]?.startLine).toBeUndefined();
      expect(history[1]?.endLine).toBeUndefined();
    } finally {
      cleanupTestRepo(repoDir);
    }
  });
});
