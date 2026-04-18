import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { GraftServer } from "../../../src/mcp/server.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createIsolatedServer, parse } from "../../helpers/mcp.js";

describe("mcp: re-read suppression", () => {
  let server: GraftServer;
  let cleanupServer: () => void;
  let tmpDir: string;
  let testFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-cache-"));
    testFile = path.join(tmpDir, "example.ts");
    fs.writeFileSync(testFile, 'export function hello(): string {\n  return "hi";\n}\n');
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

  it("returns content on first read", async () => {
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    expect(result["projection"]).toBe("content");
    expect(result["reason"]).toBe("CONTENT");
  });

  it("returns cache_hit on second read of unchanged file", async () => {
    await server.callTool("safe_read", { path: testFile });
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    expect(result["projection"]).toBe("cache_hit");
    expect(result["reason"]).toBe("REREAD_UNCHANGED");
  });

  it("cache_hit includes outline and jump table", async () => {
    await server.callTool("safe_read", { path: testFile });
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    expect(result["outline"]).toBeDefined();
    expect(result["jumpTable"]).toBeDefined();
  });

  it("cache_hit includes readCount", async () => {
    await server.callTool("safe_read", { path: testFile });
    const r2 = parse(await server.callTool("safe_read", { path: testFile }));
    expect(r2["readCount"]).toBe(2);
    const r3 = parse(await server.callTool("safe_read", { path: testFile }));
    expect(r3["readCount"]).toBe(3);
  });

  it("cache_hit includes estimatedBytesAvoided", async () => {
    await server.callTool("safe_read", { path: testFile });
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    expect(result["estimatedBytesAvoided"]).toBeDefined();
    expect(typeof result["estimatedBytesAvoided"]).toBe("number");
    expect(result["estimatedBytesAvoided"] as number).toBeGreaterThan(0);
  });

  it("returns diff when file changes between reads", async () => {
    await server.callTool("safe_read", { path: testFile });
    fs.writeFileSync(testFile, 'export function goodbye(): string {\n  return "bye";\n}\n');
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    expect(result["projection"]).toBe("diff");
    expect(result["reason"]).toBe("CHANGED_SINCE_LAST_READ");
    // Verify diff structure has the expected added entry
    const diff = result["diff"] as { added: { name: string }[]; removed: { name: string }[] };
    expect(diff.added.some((d) => d.name === "goodbye")).toBe(true);
    expect(diff.removed.some((d) => d.name === "hello")).toBe(true);
  });

  it("different files have independent cache entries", async () => {
    const otherFile = path.join(tmpDir, "other.ts");
    fs.writeFileSync(otherFile, "export const x = 1;\n");

    await server.callTool("safe_read", { path: testFile });
    const result = parse(await server.callTool("safe_read", { path: otherFile }));
    // First read of otherFile — should be content, not cache_hit
    expect(result["projection"]).toBe("content");
  });

  it("file_outline also uses cache on re-read", async () => {
    await server.callTool("file_outline", { path: testFile });
    const result = parse(await server.callTool("file_outline", { path: testFile }));
    expect(result["cacheHit"]).toBe(true);
    expect(result["outline"]).toBeDefined();
    expect(result["jumpTable"]).toBeDefined();
  });

  it("file_outline cache invalidates when file changes", async () => {
    await server.callTool("file_outline", { path: testFile });
    fs.writeFileSync(testFile, "export const changed = true;\n");
    const result = parse(await server.callTool("file_outline", { path: testFile }));
    expect(result["cacheHit"]).toBeUndefined();
    expect(result["outline"]).toBeDefined();
  });

  it("stats includes cache metrics", async () => {
    await server.callTool("safe_read", { path: testFile });
    await server.callTool("safe_read", { path: testFile });
    await server.callTool("safe_read", { path: testFile });
    const stats = parse(await server.callTool("stats", {}));
    expect(stats["totalCacheHits"]).toBe(2);
    expect(typeof stats["totalBytesAvoidedByCache"]).toBe("number");
    expect(stats["totalBytesAvoidedByCache"] as number).toBeGreaterThan(0);
  });

  it("cache_hit includes lastReadAt timestamp", async () => {
    await server.callTool("safe_read", { path: testFile });
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    expect(result["lastReadAt"]).toBeDefined();
    expect(typeof result["lastReadAt"]).toBe("string");
    expect(result["lastReadAt"] as string).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("banned files are not cached (still refused on re-read)", async () => {
    const envFile = path.join(tmpDir, ".env");
    fs.writeFileSync(envFile, "SECRET=hunter2\n");
    const r1 = parse(await server.callTool("safe_read", { path: envFile }));
    expect(r1["projection"]).toBe("refused");
    const r2 = parse(await server.callTool("safe_read", { path: envFile }));
    expect(r2["projection"]).toBe("refused");
    // Should NOT be cache_hit — refusals are not cached
    expect(r2["reason"]).toBe("SECRET");
  });

  it("markdown outlines are cached by safe_read once markdown is supported", async () => {
    const mdFile = path.join(tmpDir, "README.md");
    fs.writeFileSync(mdFile, "# Heading\n\n".repeat(220));

    const r1 = parse(await server.callTool("safe_read", { path: mdFile }));
    expect(r1["reason"]).toBe("OUTLINE");

    const r2 = parse(await server.callTool("safe_read", { path: mdFile }));
    expect(r2["projection"]).toBe("cache_hit");
    expect(r2["outline"]).toContainEqual(
      expect.objectContaining({ kind: "heading", name: "Heading" }),
    );
  });

  it("markdown outlines are cached by file_outline once markdown is supported", async () => {
    const mdFile = path.join(tmpDir, "README.md");
    fs.writeFileSync(mdFile, "# Heading\n\n".repeat(220));

    const r1 = parse(await server.callTool("file_outline", { path: mdFile }));
    expect(r1["outline"]).toContainEqual(
      expect.objectContaining({ kind: "heading", name: "Heading" }),
    );

    const r2 = parse(await server.callTool("file_outline", { path: mdFile }));
    expect(r2["cacheHit"]).toBe(true);
    expect(r2["outline"]).toContainEqual(
      expect.objectContaining({ kind: "heading", name: "Heading" }),
    );
  });

  it("changed_since reports structural diffs for markdown headings", async () => {
    const mdFile = path.join(tmpDir, "README.md");
    fs.writeFileSync(mdFile, "# Heading\n\nOne\n");

    const readResult = parse(await server.callTool("safe_read", { path: mdFile }));
    expect(["CONTENT", "OUTLINE"]).toContain(readResult["reason"]);

    fs.writeFileSync(mdFile, "# Heading\n\nOne\n\n# Added\n\nTwo\n");

    const changedResult = parse(await server.callTool("changed_since", { path: mdFile }));
    const diff = changedResult["diff"] as { added: { name: string; kind: string }[] };
    expect(diff.added).toContainEqual(
      expect.objectContaining({ name: "Added", kind: "heading" }),
    );
  });
});
