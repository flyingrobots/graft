import { describe, it, expect } from "vitest";
import { fileOutline } from "../../../src/operations/file-outline.js";
import { nodeFs } from "../../../src/adapters/node-fs.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const FIXTURES = path.resolve(import.meta.dirname, "../../fixtures");

describe("operations: file_outline", () => {
  it("returns outline for any file (never refused)", async () => {
    const result = await fileOutline(path.join(FIXTURES, "large.ts"), { fs: nodeFs });
    expect(result.outline).toBeDefined();
    expect(result.outline.length).toBeGreaterThan(0);
  });

  it("includes jump table", async () => {
    const result = await fileOutline(path.join(FIXTURES, "medium.ts"), { fs: nodeFs });
    expect(result.jumpTable).toBeDefined();
    expect(result.jumpTable.length).toBeGreaterThan(0);
    expect(result.jumpTable[0]).toHaveProperty("symbol");
    expect(result.jumpTable[0]).toHaveProperty("start");
    expect(result.jumpTable[0]).toHaveProperty("end");
    expect(result.jumpTable[0]).toHaveProperty("kind");
  });

  it("extracts classes, functions, interfaces, types from medium.ts", async () => {
    const result = await fileOutline(path.join(FIXTURES, "medium.ts"), { fs: nodeFs });
    const kinds = result.outline.map((e) => e.kind);
    expect(kinds).toContain("class");
    expect(kinds).toContain("function");
    expect(kinds).toContain("interface");
    expect(kinds).toContain("type");
  });

  it("returns error for nonexistent file", async () => {
    const result = await fileOutline(path.join(FIXTURES, "nope.ts"), { fs: nodeFs });
    expect(result.error).toBeDefined();
  });

  it("handles broken files with partial: true", async () => {
    const result = await fileOutline(path.join(FIXTURES, "broken.ts"), { fs: nodeFs });
    expect(result.partial).toBe(true);
    expect(result.outline.length).toBeGreaterThan(0);
  });

  it("includes path in result", async () => {
    const filePath = path.join(FIXTURES, "small.ts");
    const result = await fileOutline(filePath, { fs: nodeFs });
    expect(result.path).toBe(filePath);
  });

  it("returns a heading outline for markdown files", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-file-outline-md-"));
    const filePath = path.join(tmpDir, "README.md");
    fs.writeFileSync(filePath, ["# Hello", "", "## Install", "", "Use it."].join("\n"));

    const result = await fileOutline(filePath, { fs: nodeFs });
    expect(result.outline).toContainEqual(
      expect.objectContaining({
        kind: "heading",
        name: "Hello",
        children: expect.arrayContaining([
          expect.objectContaining({ kind: "heading", name: "Install" }),
        ]) as unknown[],
      }),
    );
    expect(result.jumpTable).toContainEqual(
      expect.objectContaining({ kind: "heading", symbol: "Install" }),
    );
    expect(result.error).toBeUndefined();
    expect(result.reason).toBeUndefined();
  });
});
