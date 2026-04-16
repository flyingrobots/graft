import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { GraftServer } from "../../../src/mcp/server.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createIsolatedServer, parse } from "../../helpers/mcp.js";

describe("mcp: changed-since-last-read", () => {
  let server: GraftServer;
  let cleanupServer: () => void;
  let tmpDir: string;
  let testFile: string;

  beforeEach(() => {
    const isolated = createIsolatedServer();
    server = isolated.server;
    cleanupServer = () => {
      isolated.cleanup();
    };
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-diff-"));
    testFile = path.join(tmpDir, "example.ts");
    fs.writeFileSync(testFile, 'export function hello(): string {\n  return "hi";\n}\n');
  });

  afterEach(() => {
    cleanupServer();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns diff projection when file changed between reads", async () => {
    await server.callTool("safe_read", { path: testFile });
    fs.writeFileSync(testFile, 'export function hello(): string {\n  return "hi";\n}\nexport function world(): void {}\n');
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    expect(result["projection"]).toBe("diff");
    expect(result["reason"]).toBe("CHANGED_SINCE_LAST_READ");
  });

  it("diff includes added symbols", async () => {
    await server.callTool("safe_read", { path: testFile });
    fs.writeFileSync(testFile, 'export function hello(): string {\n  return "hi";\n}\nexport function added(): void {}\n');
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    const diff = result["diff"] as { added: { name: string }[] };
    expect(diff.added.some((d) => d.name === "added")).toBe(true);
  });

  it("diff includes removed symbols", async () => {
    fs.writeFileSync(testFile, 'export function first(): void {}\nexport function second(): void {}\n');
    await server.callTool("safe_read", { path: testFile });
    fs.writeFileSync(testFile, 'export function first(): void {}\n');
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    const diff = result["diff"] as { removed: { name: string }[] };
    expect(diff.removed.some((d) => d.name === "second")).toBe(true);
  });

  it("diff includes changed signatures with old and new values", async () => {
    await server.callTool("safe_read", { path: testFile });
    fs.writeFileSync(testFile, 'export function hello(name: string): string {\n  return name;\n}\n');
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    const diff = result["diff"] as { changed: { name: string; oldSignature: string; signature: string }[] };
    const entry = diff.changed.find((d) => d.name === "hello");
    expect(entry).toBeDefined();
    expect(entry!.oldSignature).toBe("hello(): string");
    expect(entry!.signature).toBe("hello(name: string): string");
  });

  it("diff includes likely rename continuity when a symbol keeps the same shape under a new name", async () => {
    fs.writeFileSync(testFile, 'export function greet(name: string): string {\n  return name;\n}\n');
    await server.callTool("safe_read", { path: testFile });
    fs.writeFileSync(testFile, 'export function welcome(name: string): string {\n  return name;\n}\n');

    const result = parse(await server.callTool("changed_since", { path: testFile }));
    const diff = result["diff"] as {
      continuity: {
        kind: string;
        confidence: string;
        oldName: string;
        newName: string;
      }[];
    };

    expect(diff.continuity).toEqual([
      expect.objectContaining({
        kind: "rename",
        confidence: "likely",
        oldName: "greet",
        newName: "welcome",
      }),
    ]);
  });

  it("includes full new outline alongside diff", async () => {
    await server.callTool("safe_read", { path: testFile });
    fs.writeFileSync(testFile, 'export function hello(): string {\n  return "hi";\n}\nexport function extra(): void {}\n');
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    expect(result["outline"]).toBeDefined();
    expect(result["jumpTable"]).toBeDefined();
  });

  it("updates observation cache after returning diff", async () => {
    await server.callTool("safe_read", { path: testFile });
    fs.writeFileSync(testFile, 'export function changed(): void {}\n');
    await server.callTool("safe_read", { path: testFile });
    // Third read — same as second, should be cache_hit now
    const r3 = parse(await server.callTool("safe_read", { path: testFile }));
    expect(r3["projection"]).toBe("cache_hit");
  });

  it("changed_since tool returns diff without full read", async () => {
    await server.callTool("safe_read", { path: testFile });
    fs.writeFileSync(testFile, 'export function hello(): string {\n  return "hi";\n}\nexport function newFn(): void {}\n');
    const result = parse(await server.callTool("changed_since", { path: testFile }));
    expect(result["diff"]).toBeDefined();
    const diff = result["diff"] as { added: { name: string }[] };
    expect(diff.added.some((d) => d.name === "newFn")).toBe(true);
  });

  it("changed_since returns no-observation when file never read", async () => {
    const result = parse(await server.callTool("changed_since", { path: testFile }));
    expect(result["status"]).toBe("no_previous_observation");
  });

  it("changed_since returns unchanged when file hasn't changed", async () => {
    await server.callTool("safe_read", { path: testFile });
    const result = parse(await server.callTool("changed_since", { path: testFile }));
    expect(result["status"]).toBe("unchanged");
  });

  it("changed_since without consume does not update cache (peek)", async () => {
    await server.callTool("safe_read", { path: testFile });
    fs.writeFileSync(testFile, 'export function hello(): string {\n  return "hi";\n}\nexport function peeked(): void {}\n');
    // Peek — does not consume
    await server.callTool("changed_since", { path: testFile });
    // safe_read should still see the change (not cache_hit)
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    expect(result["projection"]).toBe("diff");
  });

  it("changed_since checks policy and refuses banned files", async () => {
    // Manually inject a stale observation for a path that is now banned.
    // This simulates: file was read when allowed, then path became banned.
    // Since we can't easily inject observations, we test the simpler case:
    // changed_since on a .min.js file that somehow has an observation.
    // The defense should catch it via evaluatePolicy.
    const minFile = path.join(tmpDir, "bundle.min.js");
    fs.writeFileSync(minFile, "var a=1;");
    // safe_read would refuse this (MINIFIED), so no observation.
    // Instead, read a normal file, rename it to banned, and call changed_since.
    fs.writeFileSync(testFile, 'export const v1 = 1;\n');
    await server.callTool("safe_read", { path: testFile });
    // Rename file to a banned path and write new content there
    const bannedPath = path.join(tmpDir, "secrets.pem");
    fs.writeFileSync(bannedPath, 'export const v2 = 2;\n');
    // Copy the observation: read testFile, then call changed_since on bannedPath.
    // This won't work because the observation is keyed by resolved path.
    // The REAL fix: changed_since should run evaluatePolicy on the path
    // before returning any structural data, even if no observation exists.
    // Test: changed_since on a banned path returns refused, not no_previous_observation.
    const result = parse(await server.callTool("changed_since", { path: bannedPath }));
    expect(result["status"]).toBe("refused");
  });

  it("changed_since refuses files matched by .graftignore", async () => {
    cleanupServer();
    fs.rmSync(tmpDir, { recursive: true, force: true });

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-diff-ignore-"));
    fs.writeFileSync(path.join(tmpDir, ".graftignore"), "generated/**\n");
    const isolated = createIsolatedServer({ projectRoot: tmpDir });
    server = isolated.server;
    cleanupServer = () => {
      isolated.cleanup();
    };

    const ignoredFile = path.join(tmpDir, "generated", "secret.ts");
    fs.mkdirSync(path.dirname(ignoredFile), { recursive: true });
    fs.writeFileSync(ignoredFile, 'export const hidden = "yes";\n');

    const result = parse(await server.callTool("changed_since", { path: "generated/secret.ts" }));
    expect(result["status"]).toBe("refused");
    expect(result["reason"]).toBe("GRAFTIGNORE");
  });

  it("changed_since with consume: true updates cache", async () => {
    await server.callTool("safe_read", { path: testFile });
    fs.writeFileSync(testFile, 'export function hello(): string {\n  return "hi";\n}\nexport function consumed(): void {}\n');
    // Consume — updates observation
    const cs = parse(await server.callTool("changed_since", { path: testFile, consume: true }));
    expect(cs["consumed"]).toBe(true);
    // safe_read should now see cache_hit (observation was consumed)
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    expect(result["projection"]).toBe("cache_hit");
  });

  it("receipt includes diff projection on changed reads", async () => {
    await server.callTool("safe_read", { path: testFile });
    fs.writeFileSync(testFile, 'export function hello(): string {\n  return "hi";\n}\nexport function extra(): void {}\n');
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    const receipt = result["_receipt"] as { projection: string; reason: string };
    expect(receipt.projection).toBe("diff");
    expect(receipt.reason).toBe("CHANGED_SINCE_LAST_READ");
  });
});
