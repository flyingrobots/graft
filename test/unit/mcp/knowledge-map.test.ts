import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { GraftServer } from "../../../src/mcp/server.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createIsolatedServer, parse } from "../../helpers/mcp.js";

describe("mcp: knowledge-map", () => {
  let server: GraftServer;
  let cleanupServer: () => void;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-knowledge-map-"));
    const isolated = createIsolatedServer({ projectRoot: tmpDir });
    server = isolated.server;
    cleanupServer = () => {
      isolated.cleanup();
    };
  });

  afterEach(() => {
    cleanupServer();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns empty map when no files have been read", async () => {
    const result = parse(await server.callTool("knowledge_map", {}));
    expect(result["totalFiles"]).toBe(0);
    expect(result["totalSymbols"]).toBe(0);
    expect(result["files"]).toEqual([]);
    expect(result["staleFiles"]).toEqual([]);
  });

  it("reports observed files after reads", async () => {
    const file = path.join(tmpDir, "alpha.ts");
    fs.writeFileSync(file, 'export function greet(): string {\n  return "hi";\n}\n');
    await server.callTool("safe_read", { path: file });

    const result = parse(await server.callTool("knowledge_map", {}));
    expect(result["totalFiles"]).toBe(1);
    expect(result["totalSymbols"]).toBe(1);
    const files = result["files"] as { path: string; symbols: string[]; readCount: number; stale: boolean }[];
    expect(files).toHaveLength(1);
    expect(files[0]!.path).toBe(file);
    expect(files[0]!.symbols).toEqual(["greet"]);
    expect(files[0]!.readCount).toBe(1);
    expect(files[0]!.stale).toBe(false);
  });

  it("detects stale files that changed since last read", async () => {
    const file = path.join(tmpDir, "beta.ts");
    fs.writeFileSync(file, 'export function original(): void {}\n');
    await server.callTool("safe_read", { path: file });

    // Modify the file after reading
    fs.writeFileSync(file, 'export function modified(): void {}\n');

    const result = parse(await server.callTool("knowledge_map", {}));
    expect(result["totalFiles"]).toBe(1);
    const files = result["files"] as { path: string; stale: boolean }[];
    expect(files[0]!.stale).toBe(true);
    const staleFiles = result["staleFiles"] as string[];
    expect(staleFiles).toContain(file);
  });

  it("tracks multiple files", async () => {
    const fileA = path.join(tmpDir, "a.ts");
    const fileB = path.join(tmpDir, "b.ts");
    fs.writeFileSync(fileA, 'export const x = 1;\n');
    fs.writeFileSync(fileB, 'export function foo(): void {}\nexport function bar(): void {}\n');
    await server.callTool("safe_read", { path: fileA });
    await server.callTool("safe_read", { path: fileB });

    const result = parse(await server.callTool("knowledge_map", {}));
    expect(result["totalFiles"]).toBe(2);
    expect(result["totalSymbols"]).toBe(3);
  });

  it("reports correct readCount for re-read files", async () => {
    const file = path.join(tmpDir, "gamma.ts");
    fs.writeFileSync(file, 'export function repeat(): void {}\n');
    await server.callTool("safe_read", { path: file });
    await server.callTool("safe_read", { path: file }); // cache hit
    await server.callTool("safe_read", { path: file }); // cache hit again

    const result = parse(await server.callTool("knowledge_map", {}));
    const files = result["files"] as { readCount: number }[];
    expect(files[0]!.readCount).toBe(3);
  });

  it("includes directory coverage summary", async () => {
    const subDir = path.join(tmpDir, "src");
    fs.mkdirSync(subDir, { recursive: true });
    const file = path.join(subDir, "index.ts");
    fs.writeFileSync(file, 'export const val = 42;\n');
    await server.callTool("safe_read", { path: file });

    const result = parse(await server.callTool("knowledge_map", {}));
    const coverage = result["directoryCoverage"] as Record<string, number>;
    // At least one directory should appear in coverage
    expect(Object.keys(coverage).length).toBeGreaterThan(0);
  });

  it("staleFiles is empty when nothing changed", async () => {
    const file = path.join(tmpDir, "stable.ts");
    fs.writeFileSync(file, 'export function stable(): void {}\n');
    await server.callTool("safe_read", { path: file });

    const result = parse(await server.callTool("knowledge_map", {}));
    expect(result["staleFiles"]).toEqual([]);
  });
});
