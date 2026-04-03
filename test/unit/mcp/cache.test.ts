import { describe, it, expect, beforeEach } from "vitest";
import { createGraftServer } from "../../../src/mcp/server.js";
import type { GraftServer } from "../../../src/mcp/server.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

function extractText(result: unknown): string {
  const r = result as { content?: { type: string; text: string }[] };
  const textBlock = r.content?.find((c) => c.type === "text");
  if (!textBlock) throw new Error("No text content in MCP result");
  return textBlock.text;
}

function parse(result: unknown): Record<string, unknown> {
  return JSON.parse(extractText(result)) as Record<string, unknown>;
}

describe("mcp: re-read suppression", () => {
  let server: GraftServer;
  let tmpDir: string;
  let testFile: string;

  beforeEach(() => {
    server = createGraftServer();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-cache-"));
    testFile = path.join(tmpDir, "example.ts");
    fs.writeFileSync(testFile, 'export function hello(): string {\n  return "hi";\n}\n');
  });

  it("returns content on first read", async () => {
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    expect(result.projection).toBe("content");
    expect(result.reason).toBe("CONTENT");
  });

  it("returns cache_hit on second read of unchanged file", async () => {
    await server.callTool("safe_read", { path: testFile });
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    expect(result.projection).toBe("cache_hit");
    expect(result.reason).toBe("REREAD_UNCHANGED");
  });

  it("cache_hit includes outline and jump table", async () => {
    await server.callTool("safe_read", { path: testFile });
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    expect(result.outline).toBeDefined();
    expect(result.jumpTable).toBeDefined();
  });

  it("cache_hit includes readCount", async () => {
    await server.callTool("safe_read", { path: testFile });
    const r2 = parse(await server.callTool("safe_read", { path: testFile }));
    expect(r2.readCount).toBe(2);
    const r3 = parse(await server.callTool("safe_read", { path: testFile }));
    expect(r3.readCount).toBe(3);
  });

  it("cache_hit includes estimatedBytesAvoided", async () => {
    await server.callTool("safe_read", { path: testFile });
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    expect(result.estimatedBytesAvoided).toBeDefined();
    expect(typeof result.estimatedBytesAvoided).toBe("number");
    expect(result.estimatedBytesAvoided as number).toBeGreaterThan(0);
  });

  it("returns diff when file changes between reads", async () => {
    await server.callTool("safe_read", { path: testFile });
    fs.writeFileSync(testFile, 'export function goodbye(): string {\n  return "bye";\n}\n');
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    expect(result.projection).toBe("diff");
    expect(result.reason).toBe("CHANGED_SINCE_LAST_READ");
  });

  it("different files have independent cache entries", async () => {
    const otherFile = path.join(tmpDir, "other.ts");
    fs.writeFileSync(otherFile, "export const x = 1;\n");

    await server.callTool("safe_read", { path: testFile });
    const result = parse(await server.callTool("safe_read", { path: otherFile }));
    // First read of otherFile — should be content, not cache_hit
    expect(result.projection).toBe("content");
  });

  it("file_outline also uses cache on re-read", async () => {
    await server.callTool("file_outline", { path: testFile });
    const result = parse(await server.callTool("file_outline", { path: testFile }));
    expect(result.cacheHit).toBe(true);
    expect(result.outline).toBeDefined();
    expect(result.jumpTable).toBeDefined();
  });

  it("file_outline cache invalidates when file changes", async () => {
    await server.callTool("file_outline", { path: testFile });
    fs.writeFileSync(testFile, "export const changed = true;\n");
    const result = parse(await server.callTool("file_outline", { path: testFile }));
    expect(result.cacheHit).toBeUndefined();
    expect(result.outline).toBeDefined();
  });

  it("stats includes cache metrics", async () => {
    await server.callTool("safe_read", { path: testFile });
    await server.callTool("safe_read", { path: testFile });
    await server.callTool("safe_read", { path: testFile });
    const stats = parse(await server.callTool("stats", {}));
    expect(stats.totalCacheHits).toBe(2);
    expect(typeof stats.totalBytesAvoidedByCache).toBe("number");
    expect(stats.totalBytesAvoidedByCache as number).toBeGreaterThan(0);
  });

  it("cache_hit includes lastReadAt timestamp", async () => {
    await server.callTool("safe_read", { path: testFile });
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    expect(result.lastReadAt).toBeDefined();
    expect(typeof result.lastReadAt).toBe("string");
    expect(result.lastReadAt as string).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("banned files are not cached (still refused on re-read)", async () => {
    const envFile = path.join(tmpDir, ".env");
    fs.writeFileSync(envFile, "SECRET=hunter2\n");
    const r1 = parse(await server.callTool("safe_read", { path: envFile }));
    expect(r1.projection).toBe("refused");
    const r2 = parse(await server.callTool("safe_read", { path: envFile }));
    expect(r2.projection).toBe("refused");
    // Should NOT be cache_hit — refusals are not cached
    expect(r2.reason).toBe("SECRET");
  });
});
