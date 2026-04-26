import { describe, it, expect } from "vitest";
import { ObservationCache } from "../../../src/operations/observation-cache.js";
import { buildKnowledgeMap } from "../../../src/operations/knowledge-map.js";
import { OutlineEntry } from "../../../src/parser/types.js";
import type { FileSystem } from "../../../src/ports/filesystem.js";

function outline(name: string, signature = `${name}(): void`): OutlineEntry {
  return new OutlineEntry({ name, kind: "function", signature, exported: true });
}

function mockFs(files: Record<string, string>): FileSystem {
  return {
    readFile: (p: string) => Promise.resolve(files[p] ?? ""),
    writeFile: () => Promise.resolve(),
    exists: (p: string) => Promise.resolve(p in files),
    readDir: () => Promise.resolve([]),
    stat: () => Promise.resolve({ isFile: true, isDirectory: false, size: 0, mtimeMs: 0 }),
    resolve: (...parts: string[]) => parts.join("/"),
    relative: (from: string, to: string) => to.replace(from + "/", ""),
    join: (...parts: string[]) => parts.join("/"),
    dirname: (p: string) => p.split("/").slice(0, -1).join("/"),
  } as unknown as FileSystem;
}

describe("operations: knowledge-map", () => {
  it("returns empty map for a fresh session with no observations", async () => {
    const cache = new ObservationCache();
    const result = await buildKnowledgeMap({
      cache,
      fs: mockFs({}),
      projectRoot: "/repo",
    });

    expect(result.totalFiles).toBe(0);
    expect(result.totalSymbols).toBe(0);
    expect(result.files).toEqual([]);
    expect(result.staleFiles).toEqual([]);
  });

  it("reports observed files with symbol counts after reads", async () => {
    const cache = new ObservationCache();
    cache.record(
      "src/app.ts",
      "hash1",
      [outline("greet", "greet(): string")],
      [],
      { lines: 1, bytes: 30 },
    );

    const result = await buildKnowledgeMap({
      cache,
      fs: mockFs({ "src/app.ts": "export function greet(): string { return 'hi'; }\n" }),
      projectRoot: "/repo",
    });

    expect(result.totalFiles).toBe(1);
    expect(result.totalSymbols).toBe(1);
    expect(result.files.length).toBe(1);
    expect(result.files[0]!.path).toBe("src/app.ts");
    expect(result.files[0]!.symbols).toContain("greet");
  });

  it("flags files modified since last read as stale", async () => {
    const cache = new ObservationCache();
    cache.record(
      "src/changed.ts",
      "old-hash",
      [outline("fn")],
      [],
      { lines: 1, bytes: 20 },
    );

    // File content has changed on disk (different from what was cached)
    const result = await buildKnowledgeMap({
      cache,
      fs: mockFs({ "src/changed.ts": "export function fn(): number { return 42; }\n" }),
      projectRoot: "/repo",
    });

    expect(result.files[0]!.stale).toBe(true);
    expect(result.staleFiles).toContain("src/changed.ts");
  });

  it("marks unchanged files as not stale", async () => {
    const cache = new ObservationCache();
    const content = "export function stable(): void {}\n";
    // Use the real hash function to make the hash match
    const { hashContent } = await import("../../../src/operations/observation-cache.js");
    const hash = hashContent(content);

    cache.record(
      "src/stable.ts",
      hash,
      [outline("stable")],
      [],
      { lines: 1, bytes: content.length },
    );

    const result = await buildKnowledgeMap({
      cache,
      fs: mockFs({ "src/stable.ts": content }),
      projectRoot: "/repo",
    });

    expect(result.files[0]!.stale).toBe(false);
    expect(result.staleFiles).toEqual([]);
  });

  it("tracks multiple files across directories", async () => {
    const cache = new ObservationCache();
    cache.record("src/mcp/server.ts", "h1",
      [outline("serve")],
      [], { lines: 1, bytes: 10 });
    cache.record("src/mcp/tools.ts", "h2",
      [outline("tool")],
      [], { lines: 1, bytes: 10 });
    cache.record("src/warp/index.ts", "h3",
      [outline("idx")],
      [], { lines: 1, bytes: 10 });

    const result = await buildKnowledgeMap({
      cache,
      fs: mockFs({
        "src/mcp/server.ts": "x",
        "src/mcp/tools.ts": "x",
        "src/warp/index.ts": "x",
      }),
      projectRoot: "/repo",
    });

    expect(result.totalFiles).toBe(3);
    expect(result.totalSymbols).toBe(3);
    // Directory coverage should show src/mcp and src/warp
    expect(Object.keys(result.directoryCoverage).length).toBeGreaterThanOrEqual(2);
  });
});
