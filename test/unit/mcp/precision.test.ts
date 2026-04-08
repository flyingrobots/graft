import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createGraftServer } from "../../../src/mcp/server.js";
import { collectSymbols } from "../../../src/mcp/tools/precision.js";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { parse } from "../../helpers/mcp.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexCommits } from "../../../src/warp/indexer.js";
import { JumpEntry, OutlineEntry } from "../../../src/parser/types.js";

function createServerInRepo(repoDir: string) {
  return createGraftServer({
    projectRoot: repoDir,
    graftDir: path.join(repoDir, ".graft"),
  });
}

describe("mcp: code_show", () => {
  it("returns working-tree source code for a known symbol", async () => {
    const tmpDir = createTestRepo("graft-precision-show-live-");
    try {
      fs.writeFileSync(
        path.join(tmpDir, "app.ts"),
        'export function greet(name: string): string {\n  return `hello ${name}`;\n}\n',
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("code_show", {
        symbol: "greet",
        path: "app.ts",
      }));

      expect(result["symbol"]).toBe("greet");
      expect(result["kind"]).toBe("function");
      expect(result["content"]).toContain("greet(name: string)");
      expect(result["source"]).toBe("live");
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("returns not found for an unknown symbol", async () => {
    const tmpDir = createTestRepo("graft-precision-show-miss-");
    try {
      fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const answer = 42;\n");
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("code_show", {
        symbol: "doesNotExist",
        path: "app.ts",
      }));

      expect(result["error"]).toContain("not found");
      expect(result["source"]).toBe("live");
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("returns an explicit ambiguity response when multiple symbols match", async () => {
    const tmpDir = createTestRepo("graft-precision-show-ambiguous-");
    try {
      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "src", "a.ts"), "export function handle(): void {}\n");
      fs.writeFileSync(path.join(tmpDir, "src", "b.ts"), "export function handle(): void {}\n");
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("code_show", {
        symbol: "handle",
      }));

      expect(result["symbol"]).toBe("handle");
      expect(result["ambiguous"]).toBe(true);
      expect(result["content"]).toBeUndefined();
      expect((result["matches"] as unknown[]).length).toBe(2);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("uses WARP for indexed historical reads", async () => {
    const tmpDir = createTestRepo("graft-precision-show-warp-");
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
      expect(result["content"]).toContain('return "v1";');
      expect(result["content"]).not.toContain('return "v2";');
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("falls back to live parsing for historical reads when WARP is not indexed", async () => {
    const tmpDir = createTestRepo("graft-precision-show-ref-live-");
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

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("code_show", {
        symbol: "greet",
        ref: c1,
      }));

      expect(result["source"]).toBe("live");
      expect(result["content"]).toContain('return "v1";');
      expect(result["content"]).not.toContain('return "v2";');
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("finds symbols in untracked working-tree files during project-wide search", async () => {
    const tmpDir = createTestRepo("graft-precision-show-untracked-");
    try {
      fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const stable = true;\n");
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      fs.writeFileSync(
        path.join(tmpDir, "draft.ts"),
        'export function draftHandle(): string {\n  return "draft";\n}\n',
      );

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("code_show", {
        symbol: "draftHandle",
      }));

      expect(result["source"]).toBe("live");
      expect(result["path"]).toBe("draft.ts");
      expect(result["content"]).toContain('return "draft";');
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("returns refusal when the target file is matched by .graftignore", async () => {
    const tmpDir = createTestRepo("graft-precision-show-ignore-");
    try {
      fs.writeFileSync(path.join(tmpDir, ".graftignore"), "generated/**\n");
      fs.mkdirSync(path.join(tmpDir, "generated"), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, "generated", "secret.ts"),
        "export function hiddenThing(): boolean {\n  return true;\n}\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("code_show", {
        symbol: "hiddenThing",
        path: "generated/secret.ts",
      }));

      expect(result["projection"]).toBe("refused");
      expect(result["reason"]).toBe("GRAFTIGNORE");
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });
});

describe("mcp: code_find", () => {
  it("finds symbols via live parsing when the repo is not indexed", async () => {
    const tmpDir = createTestRepo("graft-precision-find-live-");
    try {
      fs.mkdirSync(path.join(tmpDir, "src", "policy"), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, "src", "policy", "evaluate.ts"),
        'export function evaluatePolicy(): boolean {\n  return true;\n}\n',
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("code_find", {
        query: "evaluate*",
      }));

      const matches = result["matches"] as { name: string; path: string }[];
      expect(result["source"]).toBe("live");
      expect(matches.some((match) => match.name === "evaluatePolicy")).toBe(true);
      expect(matches.every((match) => typeof match.path === "string")).toBe(true);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("supports case-insensitive substring discovery for plain queries", async () => {
    const tmpDir = createTestRepo("graft-precision-find-substring-live-");
    try {
      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, "src", "adapters.ts"),
        "export class Adapter {}\n" +
          "export function adapterFactory(): Adapter { return new Adapter(); }\n" +
          "export class GitWarpAdapter {}\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("code_find", {
        query: "adapter",
      }));

      const names = (result["matches"] as { name: string }[]).map((match) => match.name);
      expect(result["source"]).toBe("live");
      expect(names).toEqual(["Adapter", "adapterFactory", "GitWarpAdapter"]);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("supports kind filters and directory scoping", async () => {
    const tmpDir = createTestRepo("graft-precision-find-scope-");
    try {
      fs.mkdirSync(path.join(tmpDir, "src", "policy"), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, "src", "ui"), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, "src", "policy", "evaluate.ts"),
        "export class PolicyEngine {}\nexport function evaluatePolicy(): boolean { return true; }\n",
      );
      fs.writeFileSync(
        path.join(tmpDir, "src", "ui", "view.ts"),
        "export class ViewModel {}\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("code_find", {
        query: "*",
        kind: "class",
        path: "src/policy",
      }));

      const matches = result["matches"] as { kind: string; path: string }[];
      expect(matches).toHaveLength(1);
      expect(matches[0]?.kind).toBe("class");
      expect(matches[0]?.path).toBe("src/policy/evaluate.ts");
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("returns empty results for a miss", async () => {
    const tmpDir = createTestRepo("graft-precision-find-miss-");
    try {
      fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const answer = 42;\n");
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("code_find", {
        query: "xyzzyNonexistent123",
      }));

      expect(result["total"]).toBe(0);
      expect(result["matches"]).toEqual([]);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("fails honestly when git file enumeration cannot run", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-precision-find-nonrepo-"));
    try {
      fs.writeFileSync(
        path.join(tmpDir, "app.ts"),
        "export function outsideRepo(): boolean { return true; }\n",
      );

      const server = createServerInRepo(tmpDir);
      await expect(server.callTool("code_find", {
        query: "outside*",
      })).rejects.toThrow(/git file listing failed/);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("uses WARP for indexed clean-head symbol search", async () => {
    const tmpDir = createTestRepo("graft-precision-find-warp-");
    try {
      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, "src", "api.ts"),
        'export function handleRequest(): string {\n  return "ok";\n}\n',
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      const warp = await openWarp({ cwd: tmpDir });
      await indexCommits(warp, { cwd: tmpDir });

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("code_find", {
        query: "handle*",
      }));

      const matches = result["matches"] as { name: string; startLine?: number; endLine?: number }[];
      expect(result["source"]).toBe("warp");
      expect(matches).toHaveLength(1);
      expect(matches[0]?.name).toBe("handleRequest");
      expect(matches[0]?.startLine).toBeDefined();
      expect(matches[0]?.endLine).toBeDefined();
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("supports case-insensitive substring discovery on indexed clean-head repos", async () => {
    const tmpDir = createTestRepo("graft-precision-find-warp-substring-");
    try {
      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, "src", "adapters.ts"),
        "export class GitWarpAdapter {}\nexport class ScenarioFixtureAdapter {}\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      const warp = await openWarp({ cwd: tmpDir });
      await indexCommits(warp, { cwd: tmpDir });

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("code_find", {
        query: "adapter",
      }));

      const names = (result["matches"] as { name: string }[]).map((match) => match.name);
      expect(result["source"]).toBe("warp");
      expect(names).toEqual(["GitWarpAdapter", "ScenarioFixtureAdapter"]);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("falls back to live search when indexed repos have dirty working-tree edits", async () => {
    const tmpDir = createTestRepo("graft-precision-find-dirty-");
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

      const matches = result["matches"] as { name: string; path: string }[];
      expect(result["source"]).toBe("live");
      expect(matches).toHaveLength(1);
      expect(matches[0]?.name).toBe("draftHelper");
      expect(matches[0]?.path).toBe("src/draft.ts");
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("assigns distinct jump-table ranges to duplicate symbol names", () => {
    const entries = [
      new OutlineEntry({
        kind: "class",
        name: "First",
        exported: true,
        children: [
          new OutlineEntry({ kind: "method", name: "handle", exported: false }),
        ],
      }),
      new OutlineEntry({
        kind: "class",
        name: "Second",
        exported: true,
        children: [
          new OutlineEntry({ kind: "method", name: "handle", exported: false }),
        ],
      }),
    ];
    const jumpTable = [
      new JumpEntry({ symbol: "First", kind: "class", start: 1, end: 4 }),
      new JumpEntry({ symbol: "handle", kind: "method", start: 2, end: 3 }),
      new JumpEntry({ symbol: "Second", kind: "class", start: 6, end: 9 }),
      new JumpEntry({ symbol: "handle", kind: "method", start: 7, end: 8 }),
    ];

    const matches = collectSymbols(entries, "app.ts", jumpTable).filter((match) => match.name === "handle");

    expect(matches).toHaveLength(2);
    expect(matches[0]?.startLine).toBe(2);
    expect(matches[1]?.startLine).toBe(7);
    expect(matches[0]?.endLine).toBe(3);
    expect(matches[1]?.endLine).toBe(8);
  });

  it("returns an explicit refusal when every matching symbol is hidden by .graftignore", async () => {
    const tmpDir = createTestRepo("graft-precision-find-ignore-");
    try {
      fs.writeFileSync(path.join(tmpDir, ".graftignore"), "generated/**\n");
      fs.mkdirSync(path.join(tmpDir, "generated"), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, "generated", "secret.ts"),
        "export function hiddenThing(): boolean {\n  return true;\n}\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("code_find", {
        query: "hidden*",
      }));

      expect(result["projection"]).toBe("refused");
      expect(result["reason"]).toBe("GRAFTIGNORE");
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });
});
