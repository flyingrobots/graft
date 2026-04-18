import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  expectGraftMapDepthOverviewPlayback,
  expectGraftMapSummaryPlayback,
} from "../../helpers/graft-map-playback.js";
import { createTestRepo, cleanupTestRepo, git } from "../../helpers/git.js";
import { createServerInRepo, parse } from "../../helpers/mcp.js";

describe("mcp: structural tool policy enforcement", () => {
  it("graft_map includes untracked working-tree files", async () => {
    const tmpDir = createTestRepo("graft-structural-policy-map-untracked-");
    try {
      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "src", "tracked.ts"), "export const tracked = true;\n");
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      fs.writeFileSync(
        path.join(tmpDir, "src", "draft.ts"),
        'export function draftOnly(): string {\n  return "draft";\n}\n',
      );

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("graft_map", { path: "src" }));

      const files = result["files"] as { path: string; symbols: { name: string }[] }[];
      const draftFile = files.find((file) => file.path === "src/draft.ts");

      expect(draftFile).toBeDefined();
      expect(draftFile?.symbols).toEqual([
        expect.objectContaining({ name: "draftOnly" }),
      ]);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("graft_map normalizes in-repo absolute path scopes", async () => {
    const tmpDir = createTestRepo("graft-structural-policy-map-abs-");
    try {
      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "src", "tracked.ts"), "export const tracked = true;\n");
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("graft_map", {
        path: path.join(tmpDir, "src"),
      }));

      expect(result["directory"]).toBe("src");
      expect(result["files"]).toEqual([
        expect.objectContaining({ path: "src/tracked.ts" }),
      ]);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("graft_map depth 0 returns direct files and summarized child directories for one-call orientation", async () => {
    const result = await expectGraftMapDepthOverviewPlayback();
    expect(result["summary"]).toContain("files");
  });

  it("graft_map summary mode reports symbol counts without emitting per-symbol payloads", async () => {
    const result = await expectGraftMapSummaryPlayback();
    expect(result["summary"]).toContain("symbols");
  });

  it("graft_map omits .graftignore-matched files and reports them explicitly", async () => {
    const tmpDir = createTestRepo("graft-structural-policy-map-");
    try {
      fs.writeFileSync(path.join(tmpDir, ".graftignore"), "generated/**\n");
      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, "generated"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "src", "visible.ts"), "export const visible = true;\n");
      fs.writeFileSync(path.join(tmpDir, "generated", "hidden.ts"), "export const hidden = true;\n");
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("graft_map", {}));

      const files = result["files"] as { path: string }[];
      const refused = result["refused"] as { path: string; reason: string }[];

      expect(files.map((file) => file.path)).toContain("src/visible.ts");
      expect(files.map((file) => file.path)).not.toContain("generated/hidden.ts");
      expect(refused).toEqual([
        expect.objectContaining({ path: "generated/hidden.ts", reason: "GRAFTIGNORE" }),
      ]);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("graft_diff excludes denied working-tree files and reports them explicitly", async () => {
    const tmpDir = createTestRepo("graft-structural-policy-diff-");
    try {
      fs.writeFileSync(path.join(tmpDir, ".graftignore"), "generated/**\n");
      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, "generated"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "src", "visible.ts"), "export const visible = true;\n");
      fs.writeFileSync(path.join(tmpDir, "generated", "hidden.ts"), "export const hidden = true;\n");
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      fs.writeFileSync(
        path.join(tmpDir, "src", "visible.ts"),
        "export const visible = true;\nexport function keepMe(): boolean { return true; }\n",
      );
      fs.writeFileSync(
        path.join(tmpDir, "generated", "hidden.ts"),
        "export const hidden = true;\nexport function denyMe(): boolean { return true; }\n",
      );

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("graft_diff", {}));

      const files = result["files"] as { path: string }[];
      const refused = result["refused"] as { path: string; reason: string }[];

      expect(files.map((file) => file.path)).toEqual(["src/visible.ts"]);
      expect(refused).toEqual([
        expect.objectContaining({ path: "generated/hidden.ts", reason: "GRAFTIGNORE" }),
      ]);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("graft_since excludes denied historical files and reports them explicitly", async () => {
    const tmpDir = createTestRepo("graft-structural-policy-since-");
    try {
      fs.writeFileSync(path.join(tmpDir, ".graftignore"), "generated/**\n");
      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, "generated"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "src", "visible.ts"), "export const visible = true;\n");
      fs.writeFileSync(path.join(tmpDir, "generated", "hidden.ts"), "export const hidden = true;\n");
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");
      const base = git(tmpDir, "rev-parse HEAD");

      fs.writeFileSync(
        path.join(tmpDir, "src", "visible.ts"),
        "export const visible = true;\nexport function keepMe(): boolean { return true; }\n",
      );
      fs.writeFileSync(
        path.join(tmpDir, "generated", "hidden.ts"),
        "export const hidden = true;\nexport function denyMe(): boolean { return true; }\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m change");
      const head = git(tmpDir, "rev-parse HEAD");

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("graft_since", { base, head }));

      const files = result["files"] as { path: string }[];
      const refused = result["refused"] as { path: string; reason: string }[];

      expect(files.map((file) => file.path)).toEqual(["src/visible.ts"]);
      expect(refused).toEqual([
        expect.objectContaining({ path: "generated/hidden.ts", reason: "GRAFTIGNORE" }),
      ]);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("keeps allowed structural results usable when a scoped diff is fully denied", async () => {
    const tmpDir = createTestRepo("graft-structural-policy-scoped-");
    try {
      fs.writeFileSync(path.join(tmpDir, ".graftignore"), "generated/**\n");
      fs.mkdirSync(path.join(tmpDir, "generated"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "generated", "hidden.ts"), "export const hidden = true;\n");
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      fs.writeFileSync(
        path.join(tmpDir, "generated", "hidden.ts"),
        "export const hidden = true;\nexport function denyMe(): boolean { return true; }\n",
      );

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("graft_diff", { path: "generated/hidden.ts" }));

      expect(result["files"]).toEqual([]);
      expect(result["refused"]).toEqual([
        expect.objectContaining({ path: "generated/hidden.ts", reason: "GRAFTIGNORE" }),
      ]);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });
});
