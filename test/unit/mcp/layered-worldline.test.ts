import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { createGraftServer } from "../../../src/mcp/server.js";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexCommits } from "../../../src/warp/indexer.js";

function extractText(result: unknown): string {
  const r = result as { content?: { type: string; text: string }[] };
  const textBlock = r.content?.find((c) => c.type === "text");
  if (!textBlock) throw new Error("No text content in MCP result");
  return textBlock.text;
}

function parse(result: unknown): Record<string, unknown> {
  return JSON.parse(extractText(result)) as Record<string, unknown>;
}

function createServerInRepo(repoDir: string) {
  const prev = process.cwd();
  process.chdir(repoDir);
  try {
    return createGraftServer();
  } finally {
    process.chdir(prev);
  }
}

describe("mcp: layered worldline model", () => {
  it("labels historical symbol reads as commit_worldline", async () => {
    const tmpDir = createTestRepo("graft-layered-worldline-commit-");
    try {
      fs.writeFileSync(
        path.join(tmpDir, "app.ts"),
        'export function greet(): string {\n  return "v1";\n}\n',
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m v1");
      const c1 = git(tmpDir, "rev-parse HEAD");

      fs.writeFileSync(
        path.join(tmpDir, "app.ts"),
        'export function greet(): string {\n  return "v2";\n}\n',
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m v2");

      const warp = await openWarp({ cwd: tmpDir });
      await indexCommits(warp, { cwd: tmpDir });

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("code_show", {
        symbol: "greet",
        ref: c1,
      }));

      expect(result["source"]).toBe("warp");
      expect(result["layer"]).toBe("commit_worldline");
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("labels branch/ref structural comparisons as ref_view", async () => {
    const tmpDir = createTestRepo("graft-layered-worldline-ref-");
    try {
      fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const base = 1;\n");
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m base");
      const baseBranch = git(tmpDir, "rev-parse --abbrev-ref HEAD");

      git(tmpDir, "checkout -q -b feature");
      fs.writeFileSync(
        path.join(tmpDir, "app.ts"),
        "export const base = 1;\nexport function featureFlag(): boolean { return true; }\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m feature");

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("graft_since", {
        base: baseBranch,
        head: "feature",
      }));

      expect(result["files"]).toBeDefined();
      expect(result["layer"]).toBe("ref_view");
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("labels dirty working-tree answers as workspace_overlay", async () => {
    const tmpDir = createTestRepo("graft-layered-worldline-workspace-");
    try {
      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "src", "stable.ts"), "export const stable = true;\n");
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      const warp = await openWarp({ cwd: tmpDir });
      await indexCommits(warp, { cwd: tmpDir });

      fs.writeFileSync(
        path.join(tmpDir, "src", "draft.ts"),
        'export function draftHelper(): string {\n  return "draft";\n}\n',
      );

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("code_find", {
        query: "draft*",
      }));

      expect(result["source"]).toBe("live");
      expect(result["layer"]).toBe("workspace_overlay");
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("doctor reports checkout epochs and semantic checkout transitions", async () => {
    const tmpDir = createTestRepo("graft-layered-worldline-transition-");
    try {
      fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const base = 1;\n");
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m base");
      const baseBranch = git(tmpDir, "rev-parse --abbrev-ref HEAD");

      git(tmpDir, "checkout -q -b feature");
      fs.writeFileSync(
        path.join(tmpDir, "app.ts"),
        "export const base = 1;\nexport const feature = 2;\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m feature");

      const server = createServerInRepo(tmpDir);
      const first = parse(await server.callTool("doctor", {}));

      git(tmpDir, `checkout -q ${baseBranch}`);
      const second = parse(await server.callTool("doctor", {}));

      expect(first["checkoutEpoch"]).toBeDefined();
      expect(second["checkoutEpoch"]).toBeDefined();
      expect(second["checkoutEpoch"]).not.toEqual(first["checkoutEpoch"]);

      const transition = second["lastTransition"] as {
        kind?: string;
        fromRef?: string;
        toRef?: string;
      };
      expect(transition.kind).toBe("checkout");
      expect(transition.fromRef).toBe("feature");
      expect(transition.toRef).toBe(baseBranch);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });
});
