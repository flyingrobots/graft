import { describe, it, expect, beforeEach, afterEach } from "vitest";
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

describe("mcp: changed-since-last-read", () => {
  let server: GraftServer;
  let tmpDir: string;
  let testFile: string;

  beforeEach(() => {
    server = createGraftServer();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-diff-"));
    testFile = path.join(tmpDir, "example.ts");
    fs.writeFileSync(testFile, 'export function hello(): string {\n  return "hi";\n}\n');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns diff projection when file changed between reads", async () => {
    await server.callTool("safe_read", { path: testFile });
    fs.writeFileSync(testFile, 'export function hello(): string {\n  return "hi";\n}\nexport function world(): void {}\n');
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    expect(result.projection).toBe("diff");
    expect(result.reason).toBe("CHANGED_SINCE_LAST_READ");
  });

  it("diff includes added symbols", async () => {
    await server.callTool("safe_read", { path: testFile });
    fs.writeFileSync(testFile, 'export function hello(): string {\n  return "hi";\n}\nexport function added(): void {}\n');
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    const diff = result.diff as { added: { name: string }[] };
    expect(diff.added.some((d) => d.name === "added")).toBe(true);
  });

  it("diff includes removed symbols", async () => {
    fs.writeFileSync(testFile, 'export function first(): void {}\nexport function second(): void {}\n');
    await server.callTool("safe_read", { path: testFile });
    fs.writeFileSync(testFile, 'export function first(): void {}\n');
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    const diff = result.diff as { removed: { name: string }[] };
    expect(diff.removed.some((d) => d.name === "second")).toBe(true);
  });

  it("diff includes changed signatures with old and new values", async () => {
    await server.callTool("safe_read", { path: testFile });
    fs.writeFileSync(testFile, 'export function hello(name: string): string {\n  return name;\n}\n');
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    const diff = result.diff as { changed: { name: string; oldSignature: string; signature: string }[] };
    const entry = diff.changed.find((d) => d.name === "hello");
    expect(entry).toBeDefined();
    expect(entry!.oldSignature).toBe("hello(): string");
    expect(entry!.signature).toBe("hello(name: string): string");
  });

  it("includes full new outline alongside diff", async () => {
    await server.callTool("safe_read", { path: testFile });
    fs.writeFileSync(testFile, 'export function hello(): string {\n  return "hi";\n}\nexport function extra(): void {}\n');
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    expect(result.outline).toBeDefined();
    expect(result.jumpTable).toBeDefined();
  });

  it("updates observation cache after returning diff", async () => {
    await server.callTool("safe_read", { path: testFile });
    fs.writeFileSync(testFile, 'export function changed(): void {}\n');
    await server.callTool("safe_read", { path: testFile });
    // Third read — same as second, should be cache_hit now
    const r3 = parse(await server.callTool("safe_read", { path: testFile }));
    expect(r3.projection).toBe("cache_hit");
  });

  it("changed_since tool returns diff without full read", async () => {
    await server.callTool("safe_read", { path: testFile });
    fs.writeFileSync(testFile, 'export function hello(): string {\n  return "hi";\n}\nexport function newFn(): void {}\n');
    const result = parse(await server.callTool("changed_since", { path: testFile }));
    expect(result.diff).toBeDefined();
    const diff = result.diff as { added: { name: string }[] };
    expect(diff.added.some((d) => d.name === "newFn")).toBe(true);
  });

  it("changed_since returns no-observation when file never read", async () => {
    const result = parse(await server.callTool("changed_since", { path: testFile }));
    expect(result.status).toBe("no_previous_observation");
  });

  it("changed_since returns unchanged when file hasn't changed", async () => {
    await server.callTool("safe_read", { path: testFile });
    const result = parse(await server.callTool("changed_since", { path: testFile }));
    expect(result.status).toBe("unchanged");
  });

  it("receipt includes diff projection on changed reads", async () => {
    await server.callTool("safe_read", { path: testFile });
    fs.writeFileSync(testFile, 'export function hello(): string {\n  return "hi";\n}\nexport function extra(): void {}\n');
    const result = parse(await server.callTool("safe_read", { path: testFile }));
    const receipt = result._receipt as { projection: string; reason: string };
    expect(receipt.projection).toBe("diff");
    expect(receipt.reason).toBe("CHANGED_SINCE_LAST_READ");
  });
});
